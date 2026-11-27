# ZABON — AI Bookkeeper Setup Guide

ZABON is a web app that reads your bank statements, uses AI to categorize every transaction, lets you review and correct them, then pushes the approved transactions directly into QuickBooks Online.

---

## What You Need Before Starting

- A **Supabase** account (free) — [supabase.com](https://supabase.com)
- An **OpenAI** account with API access — [platform.openai.com](https://platform.openai.com)
- A **QuickBooks Online** sandbox or live account
- An **Intuit Developer** account — [developer.intuit.com](https://developer.intuit.com)
- **Node.js 18+** installed on your computer

---

## Step 1: Clone & Install

```bash
git clone https://github.com/your-org/zabon.git
cd zabon
npm install
```

---

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once it's ready, go to **SQL Editor** in the sidebar
3. Open the file `supabase-schema.sql` from this repo and paste the entire contents into the editor
4. Click **Run** — this creates all the tables ZABON needs
5. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 3: Get Your OpenAI Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy it → `OPENAI_API_KEY`

> ZABON uses GPT-4o. Make sure your account has GPT-4o access.

---

## Step 4: Set Up QuickBooks Online

### Create an Intuit App

1. Go to [developer.intuit.com](https://developer.intuit.com) and sign in
2. Click **Dashboard → Create an App**
3. Choose **QuickBooks Online and Payments**
4. Name it "ZABON" or whatever you like
5. Under **Keys & OAuth**, copy:
   - **Client ID** → `QBO_CLIENT_ID`
   - **Client Secret** → `QBO_CLIENT_SECRET`
6. Under **Redirect URIs**, add: `http://localhost:3000/api/auth/quickbooks/callback`
7. Save

> **Sandbox vs Production:** Start with sandbox. Under your app settings, you'll see separate sandbox and production keys. The `.env.local.example` has the sandbox keys pre-filled.

---

## Step 5: Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in every value from the steps above. The file has comments explaining each one.

---

## Step 6: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 7: Connect QuickBooks

1. Go to [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. Click **Connect QuickBooks** in the top right
3. Log into your Intuit sandbox account and authorize
4. You'll be redirected back with a green "QuickBooks Connected" badge

---

## Step 8: Upload a Statement

1. Export your RBC statement as CSV from online banking
   - **RBC Online Banking → Accounts → Download → CSV**
   - Works for both chequing/savings and credit cards
2. Drag the CSV file into the upload zone on the dashboard
3. Wait ~10-20 seconds for AI to categorize all transactions
4. Review the suggestions in the table

---

## Step 9: Review & Push

- **Approve** transactions you agree with (checkboxes + Approve button)
- **Change categories** using the dropdown in each row
- **Reject** anything that shouldn't be posted
- When ready, click **Push to QuickBooks** — approved transactions go in as expenses

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add all your environment variables from `.env.local`.

**Important:** Update `QBO_REDIRECT_URI` to your production URL and add it to your Intuit app's allowed redirect URIs.

---

## File Structure

```
zabon/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Landing page
│   │   ├── dashboard/page.tsx                # Main review UI
│   │   └── api/
│   │       ├── auth/quickbooks/              # OAuth initiation
│   │       │   ├── route.ts
│   │       │   └── callback/route.ts         # OAuth callback
│   │       └── transactions/
│   │           ├── upload/route.ts           # CSV upload + parse
│   │           ├── categorize/route.ts       # GPT-4o categorization
│   │           ├── review/route.ts           # Approve/reject/recategorize
│   │           ├── list/route.ts             # Fetch transactions
│   │           └── push/route.ts             # Push to QuickBooks
│   └── components/
│       ├── TransactionTable.tsx              # Review table
│       └── UploadZone.tsx                    # Drag-and-drop upload
├── supabase-schema.sql                       # Database setup
├── .env.local.example                        # Environment variable template
└── README.md                                 # This file
```

---

## Common Issues

**"No transactions found" after upload**
→ Make sure you're exporting as CSV, not Excel. In RBC, look for "Download" and select "CSV".

**"Account not found in QBO"**
→ The account names in ZABON must match exactly what's in your QuickBooks chart of accounts. Log into QBO and check Settings → Chart of Accounts.

**"Token refresh failed"**
→ Your QuickBooks refresh token expires after 100 days. Just reconnect via the **Connect QuickBooks** button.

**AI categorizes everything as "Miscellaneous"**
→ Check that your `OPENAI_API_KEY` is valid and has GPT-4o access. You can test at [platform.openai.com/playground](https://platform.openai.com/playground).

---

## Support

Built by ZABON. Questions? Open an issue on GitHub.
