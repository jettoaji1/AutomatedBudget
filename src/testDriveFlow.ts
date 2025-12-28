import 'dotenv/config';

import { GoogleDriveClient } from './storage/GoogleDriveClient.js';
import { UserStorage } from './storage/UserStorage.js';
import { AccountStorage } from './storage/AccountStorage.js';
import { CategoryStorage } from './storage/CategoryStorage.js';
import { PeriodStorage } from './storage/PeriodStorage.js';

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

  if (!account) {
    account = await accountStorage.createAccount(
      user.user_id,
      'Barclays',
      'Current Account',
      'GBP'
    );
  } else {
  }


  //initialise categories
  const categories = await categoryStorage.initializeCategories(user.user_id);

  //confirm default category
  const defaultCategory = categories.find(c => c.is_default);

  console.log('=== Runner completed ===')
  }

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});