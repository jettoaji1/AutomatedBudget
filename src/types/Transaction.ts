// src/types/Transaction.ts
import { randomUUID } from 'node:crypto';
/**
 * Transaction entity
 * Represents a single financial transaction from Open Banking.
 * Stored in: periods/{period_id}.json (as part of a PeriodData object)
 * 
 * Each transaction belongs to exactly:
 * - One account
 * - One budget period
 * - One category
 */
export interface Transaction {
  transaction_id: string;      // Internal UUID
  external_id: string;         // Open Banking transaction ID (for de-duplication)
  account_id: string;          // Foreign key to Account
  user_id: string;             // Foreign key to User
  period_id: string;           // Foreign key to BudgetPeriod
  date: string;                // ISO 8601 date (YYYY-MM-DD)
  amount: number;              // Transaction amount (negative for spending)
  merchant_name: string;       // e.g., "Tesco", "Shell"
  description: string;         // Full transaction description from bank
  category_id: string;         // Foreign key to Category
  original_category: string | null; // Original category from Open Banking (if any)
  is_manual_override: boolean; // true if user manually changed category
  created_at: string;          // ISO 8601 timestamp (when first imported)
  updated_at: string;          // ISO 8601 timestamp (last modified)
}

/**
 * Container for period data
 * This is the complete structure stored in periods/{period_id}.json
 */
export interface PeriodData {
  period: BudgetPeriod;
  transactions: Transaction[];
}

/**
 * Creates a new Transaction from Open Banking data
 * 
 * @param external_id - The unique ID from Open Banking (used for de-duplication)
 * @param default_category_id - The ID of the default "Other" category
 */
export function createTransaction(
  external_id: string,
  account_id: string,
  user_id: string,
  period_id: string,
  date: string,
  amount: number,
  merchant_name: string,
  description: string,
  default_category_id: string,
  original_category: string | null = null
): Transaction {
  const now = new Date().toISOString();
  
  return {
    transaction_id: randomUUID(),
    external_id,
    account_id,
    user_id,
    period_id,
    date,
    amount,
    merchant_name,
    description,
    category_id: default_category_id,
    original_category,
    is_manual_override: false,
    created_at: now,
    updated_at: now
  };
}

/**
 * Import type definition for BudgetPeriod (to avoid circular dependency)
 */
import { BudgetPeriod } from './BudgetPeriod.js';
