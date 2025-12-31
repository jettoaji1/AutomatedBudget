# Phase 2A Manual Testing Plan

## Prerequisites
- Dev server running (`npm run dev`)
- Google OAuth configured correctly
- Fresh browser session (cleared cookies)
- Access to Google Drive to inspect files

---

## Test 1: Initial Authentication & Setup

**Steps:**
1. Navigate to `http://localhost:3000`
2. Click "Connect Google Drive"
3. Complete Google OAuth flow
4. Grant Drive permissions

**Expected Behavior:**
- Redirected to Google auth page
- After granting access, redirected to `/dashboard`
- No console errors
- Setup completes automatically

**Verification in Drive:**
Open Google Drive and verify folder structure:
```
/BudgetingApp/
├── user/user.json
├── accounts/{account_id}.json
├── categories/categories.json
└── periods/{period_id}.json
```

**Pass/Fail:** ___

---

## Test 2: Dashboard Data Display

**Steps:**
1. After auth, view `/dashboard`

**Expected Behavior:**
- Three info cards display:
  - Period Start: Shows start_date from period metadata
  - Period End: Shows end_date from period metadata  
  - Starting Balance: Shows starting_balance from period metadata
- Category Spending section shows at least "Other" category
- No console errors

**Verification:**
- Open `periods/{period_id}.json` in Drive
- Confirm dashboard values match period metadata exactly

**Pass/Fail:** ___

---

## Test 3: Category Spending Computation

**Steps:**
1. On dashboard, note "Other" category shows:
   - Spent: £0.00
   - Limit: £0.00
   - Remaining: £0.00
   - Percentage: 0%

**Expected Behavior:**
- Values computed from transactions array (currently empty)
- Formula: spent = sum(|amount|) where amount < 0
- remaining = max(0, monthly_limit - spent)
- percentage = (spent / monthly_limit) * 100

**Verification:**
- Check `periods/{period_id}.json` - transactions array is empty
- Check `categories/categories.json` - "Other" has monthly_limit: 0
- Dashboard computation matches these values

**Pass/Fail:** ___

---

## Test 4: Add Categories

**Steps:**
1. Navigate to `/categories`
2. Click "+ Add New Category"
3. Enter name: "Groceries", limit: "300"
4. Click "Add Category"
5. Repeat: name: "Transport", limit: "150"

**Expected Behavior:**
- Each new category appears in list immediately
- Name and limit display correctly
- "Edit" and "Archive" buttons visible (not for "Other")

**Verification:**
- Refresh page - categories persist
- Open `categories/categories.json` in Drive
- Verify both categories exist with correct values
- All categories have unique category_id
- "Other" still has is_default: true

**Pass/Fail:** ___

---

## Test 5: Edit Category

**Steps:**
1. On `/categories`, click "Edit" for "Groceries"
2. Change limit to "350"
3. Click "Save"

**Expected Behavior:**
- Edit mode shows populated input fields
- After save, returns to view mode showing new values
- No errors

**Verification:**
- Refresh page - change persists
- Open `categories/categories.json` in Drive
- "Groceries" monthly_limit is now 350

**Pass/Fail:** ___

---

## Test 6: Default Category Protection

**Steps:**
1. On `/categories`, examine "Other" category

**Expected Behavior:**
- "Other" has label "(Default)"
- No "Archive" button present
- "Edit" button allows changing limit but not name

**Verification:**
- Attempt to edit "Other" name succeeds or is prevented
- No way to archive via UI

**Pass/Fail:** ___

---

## Test 7: Archive Custom Category

**Steps:**
1. Create category "Test" with limit 100
2. Click "Archive" on "Test"
3. Confirm dialog
4. Refresh page

**Expected Behavior:**
- Confirmation dialog appears
- After confirm, category disappears from active list
- Category not visible after refresh

**Verification:**
- Open `categories/categories.json` in Drive
- "Test" category exists with archived_at timestamp (not null)
- Category still referenced in file (not deleted)

**Pass/Fail:** ___

---

## Test 8: Attempt to Archive Default via API

**Steps:**
1. Open browser DevTools console
2. Execute:
```javascript
fetch('/api/categories/{other_category_id}/archive', {method: 'POST'})
  .then(r => r.json())
  .then(console.log)
```
(Replace `{other_category_id}` with actual ID from categories.json)

**Expected Behavior:**
- Returns 400 status
- Error message: "Cannot archive the default 'Other' category"

**Pass/Fail:** ___

---

## Test 9: Empty Transactions View

**Steps:**
1. Navigate to `/transactions`

**Expected Behavior:**
- Shows message: "No transactions found for this period"
- No errors in console
- Page renders correctly

**Pass/Fail:** ___

---

## Test 10: Data Persistence Across Sessions

**Steps:**
1. Create 2 categories ("Food": 200, "Bills": 500)
2. Sign out (top right)
3. Close browser completely
4. Open new browser window
5. Navigate to `http://localhost:3000`
6. Sign in again

**Expected Behavior:**
- After signing in, redirected to dashboard
- Navigate to `/categories`
- Both "Food" and "Bills" categories exist with correct limits
- Period dates unchanged

**Verification:**
- Drive files unchanged
- No duplicate data created

**Pass/Fail:** ___

---

## Test 11: Setup Idempotency

**Steps:**
1. After initial setup complete, make another request:
```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_COOKIE"
```
(Get session cookie from browser DevTools > Application > Cookies)

**Expected Behavior:**
- Returns success response
- No duplicate user created
- No duplicate account created
- No duplicate default category
- No duplicate period

**Verification:**
- Check Drive files - exactly one of each:
  - One user.json
  - One account in accounts/
  - One "Other" category (is_default: true)
  - One or more periods (only current is active)

**Pass/Fail:** ___

---

## Test 12: Period Metadata Integrity

**Steps:**
1. View dashboard
2. Note all three values: start_date, end_date, starting_balance

**Expected Behavior:**
- Values are internally consistent
- end_date is after start_date
- starting_balance is a number

**Verification:**
- Open `periods/{period_id}.json` in Drive
- Dashboard values exactly match period.start_date, period.end_date, period.starting_balance
- period.period_type is "FIXED_DATE"
- period.anchor_date is present
- transactions array is present (may be empty)

**Pass/Fail:** ___

---

## Test 13: Navigation State

**Steps:**
1. Click Dashboard nav link
2. Click Transactions nav link  
3. Click Categories nav link
4. Observe active state indicator

**Expected Behavior:**
- Each page loads without errors
- Active nav link has visual indicator (underline/highlight)
- User email displayed in top right
- "Sign Out" button visible and functional

**Pass/Fail:** ___

---

## Test 14: Drive File Structure Validation

**Steps:**
1. Open Google Drive
2. Navigate to `/BudgetingApp/` folder
3. Check all subfolders and files

**Expected Structure:**
```
/BudgetingApp/
├── user/
│   └── user.json
├── accounts/
│   └── {account_id}.json
├── categories/
│   └── categories.json
└── periods/
    └── {period_id}.json (one or more)
```

**Validation Checks:**
- `user/user.json`: Contains user_id, created_at
- `accounts/{account_id}.json`: Contains user_id, bank_name, currency
- `categories/categories.json`: Contains array with at least "Other" (is_default: true)
- `periods/{period_id}.json`: Contains period object + transactions array

**All JSON files:**
- Valid JSON syntax
- No duplicate IDs
- Timestamps in ISO 8601 format
- Foreign keys reference valid IDs

**Pass/Fail:** ___

---

## Test 15: Category Summary Computation

**Steps:**
1. Note "Groceries" limit: 300
2. In `periods/{period_id}.json`, manually add a transaction:
```json
{
  "transaction_id": "test-001",
  "external_id": "ext-001",
  "account_id": "your_account_id",
  "user_id": "your_user_id",
  "period_id": "your_period_id",
  "date": "2024-01-15",
  "amount": -45.50,
  "merchant_name": "Tesco",
  "description": "Groceries",
  "category_id": "groceries_category_id",
  "original_category": null,
  "is_manual_override": false,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```
3. Refresh dashboard

**Expected Behavior:**
- "Groceries" category shows:
  - Spent: £45.50
  - Limit: £300.00
  - Remaining: £254.50
  - Percentage: 15%

**Formula validation:**
- spent = |amount| where amount < 0 = 45.50
- remaining = max(0, 300 - 45.50) = 254.50
- percentage = (45.50 / 300) * 100 = 15%

**Pass/Fail:** ___

---

## Summary Table

| # | Test | Pass | Fail | Notes |
|---|------|------|------|-------|
| 1 | Auth & Setup | ☐ | ☐ | |
| 2 | Dashboard Display | ☐ | ☐ | |
| 3 | Category Computation | ☐ | ☐ | |
| 4 | Add Categories | ☐ | ☐ | |
| 5 | Edit Category | ☐ | ☐ | |
| 6 | Default Protection | ☐ | ☐ | |
| 7 | Archive Custom | ☐ | ☐ | |
| 8 | Archive Default Block | ☐ | ☐ | |
| 9 | Empty Transactions | ☐ | ☐ | |
| 10 | Data Persistence | ☐ | ☐ | |
| 11 | Setup Idempotency | ☐ | ☐ | |
| 12 | Period Integrity | ☐ | ☐ | |
| 13 | Navigation | ☐ | ☐ | |
| 14 | Drive Structure | ☐ | ☐ | |
| 15 | Spending Calculation | ☐ | ☐ | |

**Total: ___ / 15 passed**

## Known Limitations (V1 Scope)

- No real transactions (requires Open Banking - Phase 3)
- Single user only
- Single account only (placeholder details)
- No automatic period transition
- No transaction import functionality
- Test 15 requires manual JSON editing

## Critical Success Criteria

For Phase 2A to be complete:
- Tests 1-4, 6-14 must pass
- Drive file structure must exactly match canonical layout
- All computations must match formulas documented
- No data corruption or duplication on repeated operations
