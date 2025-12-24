# Data Layer Implementation Summary

## Overview

This implementation provides a complete data layer and persistence system for the automated budgeting tool V1, using Google Drive as the persistent storage backend.

## Architecture Decisions

### 1. Storage Structure

```
Google Drive: /BudgetingApp/
├── user.json                    (User entity)
├── accounts/
│   └── {account_id}.json       (Account entity, one per account)
├── categories/
│   └── categories.json         (All categories in one file)
└── periods/
    ├── {period_id}.json        (Period metadata + transactions)
    ├── {period_id}.json
    └── ...
```

**Rationale:**
- **Flat structure**: Simple, easy to navigate, suitable for V1 scale
- **Period = file**: Each period is self-contained with its transactions
- **Categories centralized**: User-level entities that span periods
- **No database**: JSON files support future migration while avoiding infrastructure complexity

### 2. Key Design Principles

#### A. De-duplication via `external_id`
- Open Banking transaction ID is the source of truth
- Prevents duplicate imports during data refresh
- Preserves user's manual category assignments

#### B. Historical Integrity
- Categories archived, never deleted
- Past transactions maintain references to original categories
- Period files are immutable after period ends (read-only)

#### C. Single Source of Truth
- Google Drive is canonical storage
- Open Banking is data ingestion only
- Browser storage (if used) is cache only

#### D. Type Safety
- Full TypeScript type definitions
- Validation at critical points (de-duplication)
- Clear interfaces between layers

## File Descriptions

### Types (`src/types/`)

| File | Purpose | Key Points |
|------|---------|------------|
| `User.ts` | User entity definition | Single user, UUID-based ID |
| `Account.ts` | Bank account entity | Single account in V1 |
| `Category.ts` | Spending category | Archived, not deleted |
| `BudgetPeriod.ts` | Period metadata | FIXED_DATE or INCOME_ANCHORED |
| `Transaction.ts` | Transaction + PeriodData | Links to account, period, category |

### Storage (`src/storage/`)

| File | Purpose | Key Operations |
|------|---------|----------------|
| `GoogleDriveClient.ts` | Low-level Drive API | CRUD for files/folders |
| `StorageConfig.ts` | Path constants | File naming conventions |
| `UserStorage.ts` | User operations | Get/create user |
| `AccountStorage.ts` | Account operations | Create/get account |
| `CategoryStorage.ts` | Category operations | CRUD + archive categories |
| `PeriodStorage.ts` | Period + transaction ops | Create periods, add/update transactions |

### Utils (`src/utils/`)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `dateUtils.ts` | Period date calculations | FIXED_DATE vs INCOME_ANCHORED logic |
| `deduplication.ts` | Transaction de-duplication | Safe merging based on external_id |

## Critical Implementation Details

### 1. Transaction De-duplication

```typescript
// When fetching new transactions from Open Banking:
const existing = periodData.transactions;
const merged = mergeTransactions(existing, newTransactions);
validateNoDuplicates(merged);

// Result: Only new transactions added, duplicates skipped
```

**How it works:**
- Build `Set<external_id>` from existing transactions
- Filter new transactions: keep only those with external_id NOT in set
- Merge arrays
- Validate: throw error if duplicates somehow exist (safety check)

### 2. Period Creation & Transition

```typescript
// On app load:
const needsNew = await periodStorage.shouldCreateNewPeriod(...);

if (needsNew) {
  const currentBalance = await fetchFromOpenBanking();
  await periodStorage.createNextPeriod(..., currentBalance);
}
```

**Logic:**
- Check if today >= current_period.end_date
- If yes, create new period with:
  - New start/end dates (calculated from anchor)
  - Current balance → starting_balance
  - Empty transactions array

### 3. Category Assignment Flow

```
1. Transaction imported → assigned to default "Other" category
2. User manually changes → is_manual_override = true
3. Category never changes automatically after manual override
4. If category archived → transactions keep reference (historical integrity)
```

### 4. Date Handling

**FIXED_DATE Period:**
```
Anchor: 15th of each month
Today: Dec 20

Current period: Dec 15 → Jan 15
Next period:    Jan 15 → Feb 15
```

**INCOME_ANCHORED Period:**
```
Anchor: Dec 25 (income date)
Today: Dec 20

Current period: Nov 25 → Dec 25
Next period:    Dec 25 → Jan 25
```

## Known Limitations & Future Enhancements

### Current Limitations (Acceptable for V1)

1. **No Index Files**: Period listing requires reading all period files
   - **Impact**: Slower with many periods (100+)
   - **Mitigation**: V1 will have limited periods (12-24 max)

2. **Account File Listing**: Getting account by user requires reading all account files
   - **Impact**: Minor, as V1 has exactly one account
   - **Mitigation**: Not needed for V1

3. **No Caching Layer**: Every operation hits Google Drive
   - **Impact**: Latency on operations
   - **Mitigation**: UI layer can cache read data

### Future Enhancements (Out of Scope)

1. **Index Files**:
   ```json
   // periods/index.json
   {
     "periods": [
       { "period_id": "...", "start_date": "...", "end_date": "..." }
     ]
   }
   ```

2. **Batch Operations**: Update multiple transactions in one write

3. **Compression**: Large period files could be compressed

4. **Migration Path**: Export to SQL/CSV for database migration

## Usage Pattern

### Typical App Flow

```typescript
// 1. Initialize
const driveClient = new GoogleDriveClient(accessToken);
await driveClient.initializeStorage();

const storage = {
  user: new UserStorage(driveClient),
  account: new AccountStorage(driveClient),
  category: new CategoryStorage(driveClient),
  period: new PeriodStorage(driveClient)
};

// 2. Get/create user
const user = await storage.user.getOrCreateUser();

// 3. Check if new period needed
if (await storage.period.shouldCreateNewPeriod(...)) {
  await storage.period.createNextPeriod(...);
}

// 4. Fetch and import transactions
const obTransactions = await fetchFromOpenBanking();
const converted = convertToInternalFormat(obTransactions);
await storage.period.addTransactions(period_id, converted);

// 5. Get data for UI
const periodData = await storage.period.getPeriod(period_id);
const categories = await storage.category.getActiveCategories(user_id);
```

## Testing Recommendations

### Unit Tests

1. **De-duplication Logic**:
   - Test `filterDuplicates()` with various scenarios
   - Validate `validateNoDuplicates()` throws on duplicates

2. **Date Calculations**:
   - Test `calculatePeriodDates()` for both period types
   - Test edge cases (month boundaries, leap years)

3. **Type Constructors**:
   - Test `createTransaction()`, `createCategory()`, etc.
   - Verify UUID generation and timestamps

### Integration Tests

1. **Full Flow**:
   - Create user → create account → create period → add transactions
   - Verify data persistence across operations

2. **De-duplication End-to-End**:
   - Import transactions twice
   - Verify count remains correct

3. **Category Reassignment**:
   - Import transaction → reassign category → verify persistence
   - Check `is_manual_override` flag

### Manual Tests (with Real Google Drive)

1. Verify folder structure created correctly
2. Inspect JSON files for proper formatting
3. Test with actual Open Banking data
4. Verify period transition at month boundary

## Security Considerations

### Current Implementation

- **No secrets stored**: Google OAuth handled externally
- **No banking credentials**: Open Banking provides tokens
- **User data scoped**: V1 single-user, but data includes user_id for future multi-user

### Future Considerations

- **Encryption at rest**: Google Drive handles this
- **Access control**: Google OAuth permissions
- **Audit trail**: Could add metadata (last_modified_by, etc.)

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|------------|-------|
| Get user | O(1) | Single file read |
| Get period | O(1) | Single file read |
| Add transactions | O(n) | Where n = existing transactions (de-dup) |
| List all periods | O(p) | Where p = number of periods |
| Get category spending | O(t) | Where t = transactions in period |

### Space Complexity

| Entity | Size | Growth |
|--------|------|--------|
| User | ~200 bytes | Constant |
| Account | ~300 bytes | Constant (1 account) |
| Categories | ~1-5 KB | Slow (10-20 categories max) |
| Period | ~10-100 KB | Linear with transactions |
| Transaction | ~300 bytes | Linear with time |

**Estimated Total Storage (1 year):**
- ~12 periods × 50 transactions/period × 300 bytes = ~180 KB
- With metadata/formatting: ~500 KB - 1 MB

## Error Handling Patterns

```typescript
// Storage operations can throw:
// 1. Network errors (Google Drive API)
// 2. Authentication errors (expired token)
// 3. Data validation errors (duplicate external_ids)
// 4. Not found errors (period/category doesn't exist)

try {
  await storage.period.addTransactions(period_id, transactions);
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle missing period
  } else if (error.message.includes('Duplicate')) {
    // Handle duplicate transactions (shouldn't happen with proper de-dup)
  } else {
    // Handle other errors (network, auth, etc.)
  }
}
```

## Migration Path

### To SQL Database

```typescript
// Export all data
const user = await storage.user.getUser();
const account = await storage.account.getAccountForUser(user.user_id);
const categories = await storage.category.getCategories(user.user_id);
const periods = await storage.period.listAllPeriods(user.user_id, account.account_id);

// Import to SQL
await db.user.create(user);
await db.account.create(account);
await db.category.bulkCreate(categories);

for (const periodData of periods) {
  await db.period.create(periodData.period);
  await db.transaction.bulkCreate(periodData.transactions);
}
```

### From JSON to CSV

```typescript
// Export transactions as CSV for analysis
const allPeriods = await storage.period.listAllPeriods(...);
const allTransactions = allPeriods.flatMap(p => p.transactions);

const csv = convertToCSV(allTransactions, {
  columns: ['date', 'amount', 'merchant_name', 'category_id', 'description']
});
```

## Conclusion

This data layer provides:

✅ **Complete persistence** for all V1 entities  
✅ **Safe de-duplication** of transactions  
✅ **Historical integrity** via category archival  
✅ **Type safety** with TypeScript  
✅ **Clear migration path** to future storage solutions  
✅ **Simplicity** appropriate for single-user MVP  

The implementation follows the specification exactly, with no additional features or abstractions beyond what's needed for V1.
