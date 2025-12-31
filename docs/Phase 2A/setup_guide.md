# Phase 2A Setup Guide

## Prerequisites

- Node.js 18+ installed
- Google Cloud Console account
- Existing storage layer code in `src/` folder (validated with `testDriveFlow`)

## Step 1: Google OAuth Setup

### 1.1 Enable Google Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Navigate to "APIs & Services" > "Library"
4. Search for "Google Drive API"
5. Click "Enable"

### 1.2 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: **Web application**
4. Name: "Budget Tool - Local Dev"
5. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
6. Click "Create"
7. **Copy the Client ID and Client Secret** (you'll need these next)

## Step 2: Project Configuration

### 2.1 Install Dependencies

```bash
npm install
```

### 2.2 Create Environment File

Create `.env.local` in project root:

```env
GOOGLE_CLIENT_ID=your_client_id_from_step_1
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_generated_secret_here
```

### 2.3 Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output and use it as the value for `NEXTAUTH_SECRET` in `.env.local`.

### 2.4 Verify Folder Structure

Ensure your project structure matches:

```
budget-app/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Server utilities
├── src/                    # Existing validated storage layer
│   ├── storage/
│   │   ├── GoogleDriveClient.ts
│   │   ├── StorageConfig.ts
│   │   ├── UserStorage.ts
│   │   ├── AccountStorage.ts
│   │   ├── CategoryStorage.ts
│   │   └── PeriodStorage.ts
│   ├── types/
│   └── utils/
├── package.json
├── tsconfig.json
└── .env.local
```

## Step 3: Google Drive API Scope Configuration

The NextAuth Google provider in `lib/auth.ts` is configured with:

**Scope:** `https://www.googleapis.com/auth/drive.file`

**Why this scope:**
- Grants access only to files created by the app
- Does not allow reading/modifying other Drive files
- Minimum privilege required for V1 storage design

**OAuth Parameters:**
- `access_type: 'offline'` - Requests refresh token
- `prompt: 'consent'` - Forces consent screen (dev only)

### Important: Refresh Token Behavior

Google only returns `refresh_token` on **first consent**. If you've previously authorized the app:

**To get a new refresh_token:**
1. Go to https://myaccount.google.com/permissions
2. Remove "Budget Tool" app access
3. Sign in again through the app
4. Google will return refresh_token on fresh consent

**For production:** Remove `prompt: 'consent'` to avoid showing consent screen on every login.

## Step 4: Verify Configuration

### 4.1 Type Check

```bash
npm run typecheck
```

**Expected:** No TypeScript errors.

**If errors occur:**
- Check that all imports resolve correctly
- Keep imports consistent with your project's module settings
- Only modify imports if `tsc --noEmit` specifically complains

### 4.2 Storage Layer Compatibility

**No changes required** to the existing storage layer. The code is already ESM-compatible and works with Next.js server components.

**Only required adjustment:** `next.config.js` must include:
```javascript
experimental: {
  serverComponentsExternalPackages: ['node:crypto']
}
```
This allows `randomUUID` from `node:crypto` to work in server components.

## Step 5: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 6: First Run

### 6.1 Authentication Flow

1. Click "Connect Google Drive"
2. Sign in with Google account
3. **Review permissions carefully** - app requests Drive file access only
4. Click "Allow"
5. You'll be redirected back to the app
6. Setup runs automatically

### 6.2 What Happens During Setup

The `/api/setup` endpoint (idempotent) creates:

1. **User record** - Single user for V1
2. **Account record** - Placeholder account (will be replaced with Open Banking in Phase 3)
3. **Default category** - "Other" category with £0 limit
4. **Active period** - Budget period starting today

### 6.3 Verify Drive Structure

After setup completes, check your Google Drive. You should see:

```
/BudgetingApp/
├── user/
│   └── user.json
├── accounts/
│   └── {account_id}.json
├── categories/
│   └── categories.json
└── periods/
    └── {period_id}.json
```

**Each file structure:**

**`user/user.json`:**
```json
{
  "user_id": "uuid",
  "created_at": "ISO timestamp"
}
```

**`accounts/{account_id}.json`:**
```json
{
  "account_id": "uuid",
  "user_id": "uuid",
  "bank_name": "Placeholder Bank",
  "account_name": "Current Account",
  "currency": "GBP",
  "created_at": "ISO timestamp"
}
```

**`categories/categories.json`:**
```json
{
  "categories": [
    {
      "category_id": "uuid",
      "user_id": "uuid",
      "name": "Other",
      "monthly_limit": 0,
      "is_default": true,
      "created_at": "ISO timestamp",
      "archived_at": null
    }
  ]
}
```

**`periods/{period_id}.json`:**
```json
{
  "period": {
    "period_id": "uuid",
    "user_id": "uuid",
    "account_id": "uuid",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "starting_balance": 0,
    "period_type": "FIXED_DATE",
    "anchor_date": "YYYY-MM-DD",
    "created_at": "ISO timestamp"
  },
  "transactions": []
}
```

## Troubleshooting

### Authentication Issues

**"Not authenticated" errors:**
- Clear browser cookies completely
- Restart dev server
- Re-authenticate with Google

**Missing refresh_token:**
- Revoke app access: https://myaccount.google.com/permissions
- Delete app entry
- Sign in again to trigger fresh consent

### Storage Issues

**"Failed to initialize storage":**
- Verify Google Drive API is enabled in Cloud Console
- Check OAuth credentials match `.env.local` exactly
- Look for specific error in server console (`npm run dev` output)

**Wrong folder structure in Drive:**
- Check `src/storage/StorageConfig.ts` matches canonical paths
- If mismatch exists, fix config constant to match canonical structure
- Delete `/BudgetingApp/` folder and re-run setup

### Module Resolution

**"Module not found" errors:**
- Run `npm install` again
- Delete `node_modules`, `.next` folders and reinstall
- Verify imports use `@/` path alias
- Check `tsconfig.json` has `"moduleResolution": "bundler"`

**Type errors in storage layer:**
- Do not modify storage layer code
- Keep imports consistent with project module settings
- Only adjust if `tsc --noEmit` requires it

## Development Workflow

```bash
# Run dev server
npm run dev

# Type check (in another terminal)
npm run typecheck

# View logs
# Server logs appear in terminal running `npm run dev`
# Client logs in browser DevTools console
```

## Next Steps

After successful setup:
1. Complete manual testing (see `TEST_PLAN.md`)
2. Verify all Drive files match canonical structure
3. Test category and period operations
4. Ready for Phase 3 (Open Banking integration)
