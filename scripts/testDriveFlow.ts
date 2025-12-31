import 'dotenv/config';

import { GoogleDriveClient } from './storage/GoogleDriveClient.js';
import { UserStorage } from './storage/UserStorage.js';
import { AccountStorage } from './storage/AccountStorage.js';
import { CategoryStorage } from './storage/CategoryStorage.js';
import { PeriodStorage } from './storage/PeriodStorage.js';
import { PeriodType } from './types/BudgetPeriod.js';
import { formatDate } from './utils/dateUtils.js';
//import { Transaction, createTransaction } from './types/Transaction.js';

async function main(){
  console.log('=== Starting Drive test runner ===')
  // Initialize with OAuth access token
  const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
 // console.log('Access token loaded:', accessToken ? `${accessToken.slice(0, 8)}...` : 'MISSING');

  if (!accessToken) {
    throw new Error('Missing GOOGLE_OAUTH_ACCESS_TOKEN in .env');
  }
  const driveClient = new GoogleDriveClient(accessToken);

  // Initialize storage structure
  await driveClient.initializeStorage();
  console.log('Drive storage initialized')

  // Create storage managers
  const userStorage = new UserStorage(driveClient);
  const accountStorage = new AccountStorage(driveClient);
  const categoryStorage = new CategoryStorage(driveClient);
  const periodStorage = new PeriodStorage(driveClient);

  const user = await userStorage.getOrCreateUser();
  console.log ('User loaded:', user.user_id)

  //initialise accounts
  let account = await accountStorage.getAccountForUser(user.user_id);

  // NOTE: runner-only default account details (replace with real Open Banking flow later)
  if (!account) {
    account = await accountStorage.createAccount(
      user.user_id,
      'Barclays',
      'Current Account',
      'GBP'
    );

  //initialise categories
  const categories = await categoryStorage.initializeCategories(user.user_id);

  //confirm default category
  const defaultCategory = categories.find(c => c.is_default);

    /* Test only // Ensure a non-default category exists 
  let groceriesCategory = categories.find(c => c.name === 'Groceries');


  if (!groceriesCategory) {
    groceriesCategory = await categoryStorage.createCategory(
      user.user_id,
      'Groceries',
      300
    );
    console.log('Created category: Groceries', groceriesCategory.category_id);
  } else {
    console.log('Using existing category: Groceries', groceriesCategory.category_id);
  }
*/
  //ensure active period
  const periodType = PeriodType.FIXED_DATE; 
  const anchorDate = formatDate(new Date());   // "today" as anchor for now
  const startingBalance = 0;                   // test value

  let currentPeriod = await periodStorage.getCurrentPeriod(user.user_id, account.account_id);

  if (!currentPeriod) {
    console.log('No active period found → creating one');
    const newPeriod = await periodStorage.createNextPeriod(
      user.user_id,
      account.account_id,
      periodType,
      anchorDate,
      startingBalance
    );

    currentPeriod = await periodStorage.getPeriod(newPeriod.period_id);
  } else {
    console.log('Active period found → reusing existing');
  }

  if (!currentPeriod) {
    throw new Error('Expected current period to exist but it is still null');
  }

    // Test transaction write + dedupe
  if (!defaultCategory) {
    throw new Error('Default category not found (expected "Other")');
  }

  const periodId = currentPeriod.period.period_id;
  const today = formatDate(new Date());

 /* Commented out as it is fake and for test only. Happy to delete when necessary
  const fakeTransactions: Transaction[] = [
    createTransaction(
      'ext_tx_001',                 // external_id (dedupe key)
      account.account_id,           // account_id
      user.user_id,                 // user_id
      periodId,                     // period_id
      today,                        // date
      -12.5,                        // amount
      'Pret A Manger',              // merchant_name
      'Lunch',                      // description
      defaultCategory.category_id,  // default_category_id ("Other")
      null                          // original_category
    ),
    createTransaction(
      'ext_tx_002',
      account.account_id,
      user.user_id,
      periodId,
      today,
      -45.0,
      'Tesco',
      'Groceries',
      defaultCategory.category_id,
      null
    )
  ];

  // Add first time
  const added1 = await periodStorage.addTransactions(periodId, fakeTransactions);
  console.log(`Added transactions (first pass): ${added1}`);

  // Add same list again (should dedupe)
  const added2 = await periodStorage.addTransactions(periodId, fakeTransactions);
  console.log(`Added transactions (second pass): ${added2}`);

  // Read back + confirm count
  const periodAfter = await periodStorage.getPeriod(periodId);
  console.log('Total transactions now:', periodAfter?.transactions.length);

  if (!periodAfter || periodAfter.transactions.length === 0) {
    throw new Error('No transactions found to test manual override');
  }

  const transactionToOverride = periodAfter.transactions[0];

  await periodStorage.updateTransactionCategory(periodId, transactionToOverride.transaction_id, groceriesCategory.category_id);
  console.log('Manual override saved for transaction:', transactionToOverride.transaction_id);

  const periodAfterOverride = await periodStorage.getPeriod(periodId);
  const overriddenTx = periodAfterOverride?.transactions.find(tx => tx.transaction_id === transactionToOverride.transaction_id);

  if (!overriddenTx) {
    throw new Error('Overridden transaction not found after update');
  }

  console.log('Override check:', {category_id: overriddenTx.category_id, is_manual_override: overriddenTx.is_manual_override, updated_at: overriddenTx.updated_at});
*/
  console.log('Active period:', {period_id: currentPeriod.period.period_id, start: currentPeriod.period.start_date, end: currentPeriod.period.end_date});


  console.log('=== Runner completed ===')
  }

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});