// src/storage/StorageConfig.ts

/**
 * Storage configuration and file path constants
 * 
 * Google Drive folder structure:
 * /BudgetingApp/           (root folder)
 * ├── user.json
 * ├── accounts/
 * │   └── {account_id}.json
 * ├── categories/
 * │   └── categories.json
 * └── periods/
 *     ├── {period_id}.json
 *     └── {period_id}.json
 * 
 * All paths are relative to the BudgetingApp root folder.
 */
export const STORAGE_CONFIG = {
  // Root folder name in Google Drive
  ROOT_FOLDER: 'BudgetingApp',
  
  // File paths
  USER_FILE: 'user.json',
  ACCOUNTS_FOLDER: 'accounts',
  CATEGORIES_FOLDER: 'categories',
  CATEGORIES_FILE: 'categories/categories.json',
  PERIODS_FOLDER: 'periods',
  
  // MIME types
  MIME_JSON: 'application/json',
  MIME_FOLDER: 'application/vnd.google-apps.folder'
} as const;

/**
 * Helper to build period file path
 */
export function getPeriodFilePath(period_id: string): string {
  return `${STORAGE_CONFIG.PERIODS_FOLDER}/${period_id}.json`;
}

/**
 * Helper to build account file path
 */
export function getAccountFilePath(account_id: string): string {
  return `${STORAGE_CONFIG.ACCOUNTS_FOLDER}/${account_id}.json`;
}
