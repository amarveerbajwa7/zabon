'use client'

import { useCallback, useState } from 'react'

interface UploadZoneProps {
  onUploadComplete: (uploadId: string, count: number) => void
  onError: (message: string) => void
  disabled?: boolean
}

export function UploadZone({ onUploadComplete, onError, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        onError('Only CSV files are supported. Please export your statement as CSV.')
        return
      }

      setIsUploading(true)
      setProgress('Uploading...')

      try {
        const formData = new FormData()
        formData.append('file', file)

        const uploadRes = await fetch('/api/transactions/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Upload failed')
        }

        setProgress(`Categorizing ${uploadData.count} transactions with AI...`)

        const categorizeRes = await fetch('/api/transactions/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upload_id: uploadData.upload_id }),
        })

        const categorizeData = await categorizeRes.json()

        if (!categorizeRes.ok) {
          throw new Error(categorizeData.error || 'Categorization failed')
        }

        setProgress(null)
        onUploadComplete(uploadData.upload_id, uploadData.count)
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Unknown error')
        setProgress(null)
      } finally {
        setIsUploading(false)
      }
    },
    [onUploadComplete, onError]
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled || isUploading) return
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [disabled, isUploading, handleFile]
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`
        relative flex flex-col items-center justify-center
        border-2 border-dashed rounded-xl p-10 text-center
        transition-all duration-200 cursor-pointer
        ${disabled || isUploading
          ? 'opacity-50 cursor-not-allowed border-zinc-700 bg-zinc-900'
          : isDragging
            ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01]'
            : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900'
        }
      `}
    >
      <input
        type="file"
        accept=".csv"
        onChange={onInputChange}
        disabled={disabled || isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />

      {isUploading ? (
        <>
          <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-300 font-medium">{progress}</p>
          <p className="text-zinc-500 text-sm mt-1">Please wait...</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg">
            {isDragging ? 'Drop it here' : 'Drop your statement here'}
          </p>
          <p className="text-zinc-400 text-sm mt-1">
            or <span className="text-indigo-400 underline">browse files</span>
          </p>
          <p className="text-zinc-600 text-xs mt-3">
            Supports RBC bank & credit card CSV exports
          </p>
        </>
      )}
    </div>
  )
}
