// lib/drive-server.ts
import { GoogleDriveClient } from '@/src/storage/GoogleDriveClient';
import { UserStorage } from '@/src/storage/UserStorage';
import { AccountStorage } from '@/src/storage/AccountStorage';
import { CategoryStorage } from '@/src/storage/CategoryStorage';
import { PeriodStorage } from '@/src/storage/PeriodStorage';

/**
 * Server-side storage manager
 * Initializes all storage layers with Drive client
 */
export class StorageManager {
  public driveClient: GoogleDriveClient;
  public userStorage: UserStorage;
  public accountStorage: AccountStorage;
  public categoryStorage: CategoryStorage;
  public periodStorage: PeriodStorage;

  constructor(accessToken: string) {
    this.driveClient = new GoogleDriveClient(accessToken);
    this.userStorage = new UserStorage(this.driveClient);
    this.accountStorage = new AccountStorage(this.driveClient);
    this.categoryStorage = new CategoryStorage(this.driveClient);
    this.periodStorage = new PeriodStorage(this.driveClient);
  }

  async initialize(): Promise<void> {
    await this.driveClient.initializeStorage();
  }
}

/**
 * Create storage manager from access token
 * This is the main entry point for API routes
 */
export async function createStorageManager(accessToken: string): Promise<StorageManager> {
  const manager = new StorageManager(accessToken);
  await manager.initialize();
  return manager;
}
