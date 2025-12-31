# Data Layer Usage Examples

This document demonstrates how to use the data layer and persistence logic.

## Initialization

```typescript
import { GoogleDriveClient } from './storage/GoogleDriveClient';
import { UserStorage } from './storage/UserStorage';
import { AccountStorage } from './storage/AccountStorage';
import { CategoryStorage } from './storage/CategoryStorage';
import { PeriodStorage } from './storage/PeriodStorage';

// Initialize with OAuth access token
const accessToken = 'your-google-oauth-token';
const driveClient = new GoogleDriveClient(accessToken);

// Initialize storage structure
await driveClient.initializeStorage();

// Create storage managers
const userStorage = new UserStorage(driveClient);
const accountStorage = new AccountStorage(driveClient);
const categoryStorage = new CategoryStorage(driveClient);
const periodStorage = new PeriodStorage(driveClient);
```

## First-Time Setup Flow

```typescript
// 1. Get or create user
const user = await userStorage.getOrCreateUser();
console.log('User ID:', user.user_id);

// 2. Create account (after Open Banking connection)
const account = await accountStorage.createAccount(
  user.user_id,
  'Barclays',
  'Current Account',
  'GBP'
);

// 3. Initialize categories with default "Other"
const categories = await categoryStorage.initializeCategories(user.user_id);
const defaultCategory = categories.find(cat => cat.is_default);

// 4. Create additional categories
const groceries = await categoryStorage.createCategory(
  user.user_id,
  'Groceries',
  300.00
);

const transport = await categoryStorage.createCategory(
  user.user_id,
  'Transport',
  150.00
);

// 5. Create first budget period
const currentBalance = 1500.00; // From Open Banking
const period = await periodStorage.createPeriod(
  user.user_id,
  account.account_id,
  '2024-12-01',
  '2025-01-01',
  currentBalance,
  PeriodType.FIXED_DATE,
  '2024-12-01'
);
```

## Importing Transactions from Open Banking

```typescript
import { createTransaction } from './types/Transaction';

// Fetch transactions from Open Banking API
const openBankingTransactions = [
  {
    id: 'ob_tx_12345',
    date: '2024-12-05',
    amount: -45.30,
    merchant: 'Tesco',
    description: 'TESCO STORES 2345'
  },
  {
    id: 'ob_tx_12346',
    date: '2024-12-06',
    amount: -12.50,
    merchant: 'TfL',
    description: 'TFL TRAVEL CHARGE'
  }
];

// Convert to internal Transaction format
const defaultCategory = await categoryStorage.getDefaultCategory(user.user_id);

const transactions = openBankingTransactions.map(obTx => 
  createTransaction(
    obTx.id,                    // external_id for de-duplication
    account.account_id,
    user.user_id,
    period.period_id,
    obTx.date,
    obTx.amount,
    obTx.merchant,
    obTx.description,
    defaultCategory!.category_id,
    null                        // no original category from Open Banking
  )
);

// Add transactions to period (with automatic de-duplication)
const addedCount = await periodStorage.addTransactions(
  period.period_id,
  transactions
);

console.log(`Added ${addedCount} new transactions`);
```

## Re-fetching Transactions (De-duplication)

```typescript
// Later, when refreshing data...
const newOpenBankingTransactions = [
  {
    id: 'ob_tx_12345',  // Duplicate - will be skipped
    date: '2024-12-05',
    amount: -45.30,
    merchant: 'Tesco',
    description: 'TESCO STORES 2345'
  },
  {
    id: 'ob_tx_12347',  // New transaction
    date: '2024-12-07',
    amount: -8.00,
    merchant: 'Costa Coffee',
    description: 'COSTA COFFEE'
  }
];

// Convert and add - duplicates automatically filtered
const newTransactions = newOpenBankingTransactions.map(obTx => 
  createTransaction(
    obTx.id,
    account.account_id,
    user.user_id,
    period.period_id,
    obTx.date,
    obTx.amount,
    obTx.merchant,
    obTx.description,
    defaultCategory!.category_id,
    null
  )
);

const addedCount = await periodStorage.addTransactions(
  period.period_id,
  newTransactions
);

console.log(`Added ${addedCount} new transactions (1 duplicate skipped)`);
```

## User Categorizing Transactions

```typescript
// Get transactions for current period
const periodData = await periodStorage.getPeriod(period.period_id);
const transactions = periodData!.transactions;

// User manually assigns a transaction to "Groceries"
const tescoTransaction = transactions.find(tx => tx.merchant_name === 'Tesco');
const groceriesCategory = await categoryStorage.getCategory('groceries-id');

await periodStorage.updateTransactionCategory(
  period.period_id,
  tescoTransaction!.transaction_id,
  groceriesCategory!.category_id
);

// Transaction now has:
// - category_id: groceriesCategory.category_id
// - is_manual_override: true
// - updated_at: current timestamp
```

## Viewing Category Spending

```typescript
// Get all active categories
const categories = await categoryStorage.getActiveCategories(user.user_id);

// For each category, get spending in current period
for (const category of categories) {
  const spending = await periodStorage.getCategorySpending(
    period.period_id,
    category.category_id
  );
  
  const percentUsed = (spending / category.monthly_limit) * 100;
  
  console.log(`${category.name}:`);
  console.log(`  Spent: £${spending.toFixed(2)}`);
  console.log(`  Limit: £${category.monthly_limit.toFixed(2)}`);
  console.log(`  Used: ${percentUsed.toFixed(1)}%`);
}
```

## Creating a New Period (Automatic)

```typescript
// Check if new period needed (e.g., on app load)
const needsNewPeriod = await periodStorage.shouldCreateNewPeriod(
  user.user_id,
  account.account_id,
  PeriodType.FIXED_DATE,
  '2024-12-01'
);

if (needsNewPeriod) {
  // Get current balance from Open Banking
  const currentBalance = 1650.00;
  
  // Create next period
  const newPeriod = await periodStorage.createNextPeriod(
    user.user_id,
    account.account_id,
    PeriodType.FIXED_DATE,
    '2024-12-01',
    currentBalance
  );
  
  console.log('Created new period:', newPeriod.period_id);
  console.log('Period:', newPeriod.start_date, 'to', newPeriod.end_date);
}
```

## Viewing Historical Periods

```typescript
// List all periods (newest first)
const allPeriods = await periodStorage.listAllPeriods(
  user.user_id,
  account.account_id
);

console.log('Historical Periods:');
for (const periodData of allPeriods) {
  const { period, transactions } = periodData;
  
  console.log(`\nPeriod: ${period.start_date} to ${period.end_date}`);
  console.log(`Starting balance: £${period.starting_balance.toFixed(2)}`);
  console.log(`Transactions: ${transactions.length}`);
  
  // Calculate total spending
  const totalSpent = transactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  
  console.log(`Total spent: £${totalSpent.toFixed(2)}`);
}
```

## Managing Categories

```typescript
// Add a new category
const entertainment = await categoryStorage.createCategory(
  user.user_id,
  'Entertainment',
  100.00
);

// Update category limit
entertainment.monthly_limit = 120.00;
await categoryStorage.updateCategory(entertainment);

// Archive a category (when no longer needed)
await categoryStorage.archiveCategory(entertainment.category_id);

// Note: Archived categories are hidden from active use but transactions
// keep their links for historical integrity
```

## Error Handling

```typescript
try {
  await periodStorage.addTransactions(period.period_id, transactions);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Duplicate external_ids')) {
      console.error('Duplicate transaction detected:', error.message);
    } else {
      console.error('Failed to add transactions:', error.message);
    }
  }
}
```

## Key Assumptions & Notes

1. **Google OAuth**: Access token must be obtained separately (not part of data layer)

2. **De-duplication**: Based on `external_id` from Open Banking - this is the source of truth for uniqueness

3. **Single User**: All storage operations assume single user (V1 constraint)

4. **Single Account**: Only one account supported in V1

5. **Period Files**: Each period is a separate JSON file containing period metadata + all transactions

6. **Category Archives**: Categories are never deleted, only archived to maintain historical transaction integrity

7. **Manual Overrides**: When user recategorizes a transaction, `is_manual_override` is set to true

8. **Read-Only History**: Historical periods (past periods) should not be modified - only viewed

9. **Currency**: All amounts are stored as numbers in account currency (no multi-currency support in V1)

10. **Date Format**: All dates stored as ISO 8601 strings (YYYY-MM-DD for dates, full ISO for timestamps)
