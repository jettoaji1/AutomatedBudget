import 'dotenv/config';

import { GoogleDriveClient } from './storage/GoogleDriveClient';
import { UserStorage } from './storage/UserStorage';
import { AccountStorage } from './storage/AccountStorage';
import { CategoryStorage } from './storage/CategoryStorage';
import { PeriodStorage } from './storage/PeriodStorage';

async function main(){
  console.log('=== Starting Drive test runner ===')
  // Initialize with OAuth access token
  const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;

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
  
  console.log('=== Runner completed ===')
  }

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});