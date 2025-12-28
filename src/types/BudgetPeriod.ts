// src/types/BudgetPeriod.ts
import { randomUUID } from 'node:crypto';
/**
 * Period type enumeration
 * FIXED_DATE: Period runs from a specific day each month (e.g., 1st to 1st)
 * INCOME_ANCHORED: Period runs from income date to next income date
 */
export enum PeriodType {
  FIXED_DATE = "FIXED_DATE",
  INCOME_ANCHORED = "INCOME_ANCHORED"
}

/**
 * BudgetPeriod entity
 * Represents a single budgeting period (typically ~1 month).
 * Each period is stored in its own file: periods/{period_id}.json
 * 
 * The period file contains:
 * - Period metadata (this interface)
 * - Array of transactions that belong to this period
 */
export interface BudgetPeriod {
  period_id: string;         // UUID format
  user_id: string;           // Foreign key to User
  account_id: string;        // Foreign key to Account
  start_date: string;        // ISO 8601 date (YYYY-MM-DD)
  end_date: string;          // ISO 8601 date (YYYY-MM-DD)
  starting_balance: number;  // Account balance at period start
  period_type: PeriodType;   // FIXED_DATE or INCOME_ANCHORED
  anchor_date: string;       // ISO 8601 date - the reference date for the period
  created_at: string;        // ISO 8601 timestamp
}

/**
 * Creates a new BudgetPeriod object
 * 
 * @param anchor_date - For FIXED_DATE: the day of month (e.g., "2024-01-15" for 15th)
 *                      For INCOME_ANCHORED: the actual income date
 */
export function createBudgetPeriod(
  user_id: string,
  account_id: string,
  start_date: string,
  end_date: string,
  starting_balance: number,
  period_type: PeriodType,
  anchor_date: string
): BudgetPeriod {
  return {
    period_id: randomUUID(),
    user_id,
    account_id,
    start_date,
    end_date,
    starting_balance,
    period_type,
    anchor_date,
    created_at: new Date().toISOString()
  };
}
