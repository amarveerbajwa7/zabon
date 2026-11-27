'use client'

import { useCallback, useState } from 'react'

interface UploadZoneProps {
  onUploadComplete: (uploadId: string, count: number) => void
  onError: (message: string) => void
  disabled?: boolean
}

interface DuplicateDialog {
  filename: string
  onConfirm: () => void
  onCancel: () => void
}

export function UploadZone({ onUploadComplete, onError, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateDialog | null>(null)

  /**
   * Process a single file. `force` skips the duplicate check on the server.
   * Returns true if the file was processed, false if skipped.
   */
  const processOneFile = useCallback(
    async (file: File, force = false): Promise<boolean> => {
      const formData = new FormData()
      formData.append('file', file)
      if (force) formData.append('force', 'true')

      const uploadRes = await fetch('/api/transactions/upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()

      // Duplicate detected → show confirmation dialog
      if (uploadRes.status === 409 && uploadData.duplicate) {
        const shouldForce = await new Promise<boolean>(resolve => {
          setDuplicateDialog({
            filename: uploadData.filename,
            onConfirm: () => {
              setDuplicateDialog(null)
              resolve(true)
            },
            onCancel: () => {
              setDuplicateDialog(null)
              resolve(false)
            },
          })
        })

        if (shouldForce) {
          return processOneFile(file, true)
        }
        return false // skipped by user
      }

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      setProgress(`Categorizing ${uploadData.count} transactions with AI…`)

      const categorizeRes = await fetch('/api/transactions/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: uploadData.upload_id }),
      })

      // 404 means already categorized by the upload route's auto-trigger — that's fine
      if (!categorizeRes.ok && categorizeRes.status !== 404) {
        const catData = await categorizeRes.json().catch(() => ({}))
        throw new Error((catData as { error?: string }).error || 'Categorization failed')
      }

      onUploadComplete(uploadData.upload_id, uploadData.count)
      return true
    },
    [onUploadComplete]
  )

  const handleFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter(f => {
        const name = f.name.toLowerCase()
        return name.endsWith('.csv') || name.endsWith('.pdf')
      })

      const invalidCount = files.length - validFiles.length
      if (invalidCount > 0 && validFiles.length === 0) {
        onError('Only CSV and PDF files are supported. Please upload a bank statement export.')
        return
      }
      if (invalidCount > 0) {
        onError(`${invalidCount} file(s) skipped — only CSV and PDF are supported.`)
      }
      if (validFiles.length === 0) return

      setIsUploading(true)

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]
        const prefix = validFiles.length > 1 ? `(${i + 1}/${validFiles.length}) ` : ''
        setProgress(`${prefix}Uploading ${file.name}…`)

        try {
          await processOneFile(file)
        } catch (err) {
          onError(
            `${validFiles.length > 1 ? `${file.name}: ` : ''}${
              err instanceof Error ? err.message : 'Unknown error'
            }`
          )
        }
      }

      setIsUploading(false)
      setProgress(null)
    },
    [processOneFile, onError]
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled || isUploading) return
      const files = Array.from(e.dataTransfer.files)
      if (files.length) handleFiles(files)
    },
    [disabled, isUploading, handleFiles]
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length) handleFiles(files)
      e.target.value = ''
    },
    [handleFiles]
  )

  return (
    <div className="relative">
      {/* Duplicate warning dialog */}
      {duplicateDialog && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-amber-400 text-xl mt-0.5">⚠</span>
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">Duplicate Document</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  <span className="text-zinc-200 font-medium">{duplicateDialog.filename}</span> has
                  already been uploaded. Upload it again anyway?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={duplicateDialog.onCancel}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={duplicateDialog.onConfirm}
                className="px-4 py-2 text-sm font-semibold text-black rounded-lg transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#D4883A' }}
              >
                Upload Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        onDragOver={e => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          relative flex flex-col items-center justify-center
          border-2 border-dashed rounded-xl p-8 text-center
          transition-all duration-200 cursor-pointer
          ${
            disabled || isUploading
              ? 'opacity-50 cursor-not-allowed border-zinc-700 bg-zinc-900'
              : isDragging
              ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
              : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900'
          }
        `}
      >
        <input
          type="file"
          accept=".csv,.pdf"
          multiple
          onChange={onInputChange}
          disabled={disabled || isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {isUploading ? (
          <>
            <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-300 font-medium text-sm">{progress}</p>
            <p className="text-zinc-500 text-xs mt-1">Please wait…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-white font-semibold">
              {isDragging ? 'Drop files here' : 'Drop statements here'}
            </p>
            <p className="text-zinc-400 text-sm mt-1">
              or <span className="text-indigo-400 underline">browse files</span>
            </p>
            <p className="text-zinc-600 text-xs mt-2">
              CSV and PDF · Multiple files supported · Any bank or credit card
            </p>
          </>
        )}
      </div>
    </div>
  )
}
