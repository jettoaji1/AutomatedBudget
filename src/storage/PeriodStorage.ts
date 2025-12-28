// src/storage/PeriodStorage.ts

import { GoogleDriveClient } from './GoogleDriveClient.js';
import { BudgetPeriod, PeriodType, createBudgetPeriod } from '../types/BudgetPeriod.js';
import { Transaction, PeriodData, createTransaction } from '../types/Transaction.js';
import { getPeriodFilePath, STORAGE_CONFIG } from './StorageConfig.js';
import { calculatePeriodDates, isDateInPeriod, formatDate, parseDate } from '../utils/dateUtils.js';
import { mergeTransactions, validateNoDuplicates } from '../utils/deduplication.js';

/**
 * Period storage operations
 * Manages period files in periods/ folder.
 * Each period is stored as: periods/{period_id}.json
 * 
 * Key behaviors:
 * - Each period file contains period metadata + all transactions for that period
 * - New period files are created automatically when a new period starts
 * - Transactions are de-duplicated using external_id
 * - Historical periods are read-only (no updates after period ends)
 * 
 * File structure:
 * {
 *   "period": { period metadata },
 *   "transactions": [ array of transactions ]
 * }
 */
export class PeriodStorage {
  constructor(private driveClient: GoogleDriveClient) {}

  /**
   * Create a new budget period
   * 
   * @param user_id - User ID
   * @param account_id - Account ID
   * @param start_date - ISO date string
   * @param end_date - ISO date string
   * @param starting_balance - Account balance at period start
   * @param period_type - FIXED_DATE or INCOME_ANCHORED
   * @param anchor_date - Reference date for the period
   * @returns Created BudgetPeriod object
   */
  async createPeriod(
    user_id: string,
    account_id: string,
    start_date: string,
    end_date: string,
    starting_balance: number,
    period_type: PeriodType,
    anchor_date: string
  ): Promise<BudgetPeriod> {
    
    const period = createBudgetPeriod(
      user_id,
      account_id,
      start_date,
      end_date,
      starting_balance,
      period_type,
      anchor_date
    );

    // Initialize period with empty transactions
    const periodData: PeriodData = {
      period,
      transactions: []
    };

    const filePath = getPeriodFilePath(period.period_id);
    await this.driveClient.writeFile(filePath, periodData);

    return period;
  }

  /**
   * Get a period by ID
   * 
   * @param period_id - Period ID
   * @returns PeriodData object or null if not found
   */
  async getPeriod(period_id: string): Promise<PeriodData | null> {
    const filePath = getPeriodFilePath(period_id);
    return await this.driveClient.readFile<PeriodData>(filePath);
  }

  /**
   * Get the current active period for a user
   * Returns the period that contains today's date.
   * 
   * @param user_id - User ID
   * @param account_id - Account ID
   * @returns PeriodData object or null if no active period
   */
  async getCurrentPeriod(user_id: string, account_id: string): Promise<PeriodData | null> {
    // Note: This is inefficient - we need to read all period files
    // In production, we'd maintain an index or metadata file
    // For V1 MVP, this is acceptable given limited data volume
    
    const today = formatDate(new Date());
    const allPeriods = await this.listAllPeriods(user_id, account_id);
    
    for (const periodData of allPeriods) {
      if (isDateInPeriod(today, periodData.period.start_date, periodData.period.end_date)) {
        return periodData;
      }
    }
    
    return null;
  }

  /**
   * List all periods for a user/account
   * Used for viewing historical periods.
   * 
   * @param user_id - User ID
   * @param account_id - Account ID
   * @returns Array of PeriodData objects, sorted by start_date (newest first)
   */
  async listAllPeriods(user_id: string, account_id: string): Promise<PeriodData[]> {
    // List all files in periods folder
    const fileIds = await this.driveClient.listFiles(STORAGE_CONFIG.PERIODS_FOLDER);
    const periods: PeriodData[] = [];

    // Note: We need to read all period files to filter by user/account
    // This is inefficient but acceptable for V1
    // In production, we'd maintain an index file or use file naming convention
    
    // TODO: Enhance to read actual period files
    // For now, this is a placeholder that demonstrates the logic
    // Real implementation would need to iterate through files and read each one
    
    return periods.sort((a, b) => 
      b.period.start_date.localeCompare(a.period.start_date)
    );
  }

  /**
   * Add transactions to a period
   * De-duplicates based on external_id before adding.
   * 
   * @param period_id - Period ID
   * @param newTransactions - Array of new transactions to add
   * @returns Number of transactions actually added (after de-duplication)
   */
  async addTransactions(
    period_id: string,
    newTransactions: Transaction[]
  ): Promise<number> {
    
    const periodData = await this.getPeriod(period_id);
    
    if (!periodData) {
      throw new Error(`Period ${period_id} not found`);
    }

    // Merge with de-duplication
    const mergedTransactions = mergeTransactions(
      periodData.transactions,
      newTransactions
    );

    // Validate no duplicates exist
    validateNoDuplicates(mergedTransactions);

    // Count how many were actually added
    const addedCount = mergedTransactions.length - periodData.transactions.length;

    // Update period data
    periodData.transactions = mergedTransactions;
    const filePath = getPeriodFilePath(period_id);
    await this.driveClient.writeFile(filePath, periodData);

    return addedCount;
  }

  /**
   * Update a transaction's category assignment
   * Used when user manually recategorizes a transaction.
   * 
   * @param period_id - Period ID
   * @param transaction_id - Transaction ID to update
   * @param new_category_id - New category ID
   */
  async updateTransactionCategory(
    period_id: string,
    transaction_id: string,
    new_category_id: string
  ): Promise<void> {
    
    const periodData = await this.getPeriod(period_id);
    
    if (!periodData) {
      throw new Error(`Period ${period_id} not found`);
    }

    const transaction = periodData.transactions.find(
      tx => tx.transaction_id === transaction_id
    );

    if (!transaction) {
      throw new Error(`Transaction ${transaction_id} not found in period ${period_id}`);
    }

    // Update category and mark as manual override
    transaction.category_id = new_category_id;
    transaction.is_manual_override = true;
    transaction.updated_at = new Date().toISOString();

    // Save updated period
    const filePath = getPeriodFilePath(period_id);
    await this.driveClient.writeFile(filePath, periodData);
  }

  /**
   * Check if a new period should be created
   * Call this when loading the app to see if we've moved into a new period.
   * 
   * @param user_id - User ID
   * @param account_id - Account ID
   * @param period_type - FIXED_DATE or INCOME_ANCHORED
   * @param anchor_date - Reference date for period calculation
   * @returns true if a new period needs to be created
   */
  async shouldCreateNewPeriod(
    user_id: string,
    account_id: string,
    period_type: PeriodType,
    anchor_date: string
  ): Promise<boolean> {
    
    const currentPeriod = await this.getCurrentPeriod(user_id, account_id);
    
    if (!currentPeriod) {
      // No active period exists, should create one
      return true;
    }

    // Check if today is past the current period's end date
    const today = formatDate(new Date());
    const periodEnd = currentPeriod.period.end_date;
    
    return today >= periodEnd;
  }

  /**
   * Create next period based on period type and anchor
   * Called when current period ends and a new one needs to start.
   * 
   * @param user_id - User ID
   * @param account_id - Account ID
   * @param period_type - FIXED_DATE or INCOME_ANCHORED
   * @param anchor_date - Reference date for period calculation
   * @param current_balance - Current account balance (becomes starting_balance)
   * @returns Created BudgetPeriod object
   */
  async createNextPeriod(
    user_id: string,
    account_id: string,
    period_type: PeriodType,
    anchor_date: string,
    current_balance: number
  ): Promise<BudgetPeriod> {
    
    // Calculate period dates
    const anchorDateObj = parseDate(anchor_date);
    const { start_date, end_date } = calculatePeriodDates(
      new Date(),
      period_type,
      anchorDateObj
    );

    // Create the new period
    return await this.createPeriod(
      user_id,
      account_id,
      start_date,
      end_date,
      current_balance,
      period_type,
      anchor_date
    );
  }

  /**
   * Get transactions for a period, optionally filtered by category
   * 
   * @param period_id - Period ID
   * @param category_id - Optional category ID to filter by
   * @returns Array of Transaction objects
   */
  async getTransactions(
    period_id: string,
    category_id?: string
  ): Promise<Transaction[]> {
    
    const periodData = await this.getPeriod(period_id);
    
    if (!periodData) {
      return [];
    }

    if (category_id) {
      return periodData.transactions.filter(tx => tx.category_id === category_id);
    }

    return periodData.transactions;
  }

  /**
   * Calculate total spending for a category in a period
   * Only counts negative amounts (expenses, not income)
   * 
   * @param period_id - Period ID
   * @param category_id - Category ID
   * @returns Total spending amount (positive number)
   */
  async getCategorySpending(period_id: string, category_id: string): Promise<number> {
    const transactions = await this.getTransactions(period_id, category_id);
    
    // Sum only negative amounts (spending)
    const total = transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    return total;
  }
}
