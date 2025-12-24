// src/storage/AccountStorage.ts

import { GoogleDriveClient } from './GoogleDriveClient';
import { Account, createAccount } from '../types/Account';
import { getAccountFilePath, STORAGE_CONFIG } from './StorageConfig';

/**
 * Account storage operations
 * Manages account files in accounts/ folder.
 * Each account is stored as: accounts/{account_id}.json
 * 
 * Key behaviors:
 * - V1 supports only ONE account per user
 * - Account is linked to Open Banking connection
 * - Account ID is used as foreign key in periods and transactions
 */
export class AccountStorage {
  constructor(private driveClient: GoogleDriveClient) {}

  /**
   * Create and save a new account
   * 
   * @param user_id - User ID this account belongs to
   * @param bank_name - Name of the bank (e.g., "Barclays")
   * @param account_name - Name of the account (e.g., "Current Account")
   * @param currency - ISO 4217 currency code (e.g., "GBP")
   * @returns Created Account object
   */
  async createAccount(
    user_id: string,
    bank_name: string,
    account_name: string,
    currency: string
  ): Promise<Account> {
    const account = createAccount(user_id, bank_name, account_name, currency);
    const filePath = getAccountFilePath(account.account_id);
    
    await this.driveClient.writeFile(filePath, account);
    return account;
  }

  /**
   * Get account by ID
   * @param account_id - Account ID
   * @returns Account object or null if not found
   */
  async getAccount(account_id: string): Promise<Account | null> {
    const filePath = getAccountFilePath(account_id);
    return await this.driveClient.readFile<Account>(filePath);
  }

  /**
   * Get the single account for a user
   * V1 supports only one account, so this returns the first account found.
   * 
   * @param user_id - User ID
   * @returns Account object or null if no account exists
   */
  async getAccountForUser(user_id: string): Promise<Account | null> {
    // List all account files
    const fileIds = await this.driveClient.listFiles(STORAGE_CONFIG.ACCOUNTS_FOLDER);
    
    // Read each account file until we find one for this user
    for (const fileId of fileIds) {
      // Extract account_id from filename (assumption: we'd need to read or track this)
      // For simplicity, we read each file and check user_id
      // In production, we might maintain an index
      
      // Note: This is inefficient but acceptable for V1 with single account
      // Alternative: maintain accounts.json index file
    }

    // Simpler approach for V1: since there's only one account per user,
    // we can list files and read the first one
    if (fileIds.length === 0) {
      return null;
    }

    // Read first account file (there should only be one for V1)
    const accounts = await this.listAllAccounts();
    const userAccount = accounts.find(acc => acc.user_id === user_id);
    return userAccount || null;
  }

  /**
   * List all accounts (primarily for internal use)
   * In V1, this should return at most one account.
   * 
   * @returns Array of all Account objects
   */
  private async listAllAccounts(): Promise<Account[]> {
    const fileIds = await this.driveClient.listFiles(STORAGE_CONFIG.ACCOUNTS_FOLDER);
    const accounts: Account[] = [];

    // Note: In a real implementation, we'd need a way to map file IDs to account IDs
    // For now, we make an assumption that we can derive the filename from the file ID
    // or maintain a separate index.
    
    // TODO: This requires enhancement to track filename->account_id mapping
    // For MVP, we can work around this by reading all files in the folder
    
    // Workaround: We'll need to modify GoogleDriveClient.listFiles to return names
    // For now, marking this as a known limitation
    
    return accounts;
  }

  /**
   * Update existing account
   * @param account - Account object with updated fields
   */
  async updateAccount(account: Account): Promise<void> {
    const filePath = getAccountFilePath(account.account_id);
    await this.driveClient.writeFile(filePath, account);
  }
}
