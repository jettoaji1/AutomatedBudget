// src/utils/deduplication.ts

import { Transaction } from '../types/Transaction.js';

/**
 * Transaction de-duplication utilities
 * 
 * Key principle: external_id from Open Banking is the unique identifier.
 * When re-fetching data from Open Banking, we use external_id to detect
 * transactions that already exist in our storage.
 * 
 * De-duplication rules:
 * 1. If external_id exists in our data -> skip (it's a duplicate)
 * 2. If external_id is new -> import as new transaction
 * 3. Never create duplicate transactions with the same external_id
 * 
 * This ensures:
 * - Historical data integrity
 * - User category assignments are preserved
 * - Manual overrides are not lost
 */

/**
 * Build a set of existing external IDs for fast lookup
 * 
 * @param existingTransactions - Array of transactions already in storage
 * @returns Set of external_id strings
 */
export function buildExternalIdSet(existingTransactions: Transaction[]): Set<string> {
  return new Set(existingTransactions.map(tx => tx.external_id));
}

/**
 * Filter out duplicate transactions from a new batch
 * Returns only transactions that don't already exist (based on external_id)
 * 
 * @param newTransactions - Array of new transactions from Open Banking
 * @param existingTransactions - Array of transactions already in storage
 * @returns Array of non-duplicate transactions to import
 */
export function filterDuplicates(
  newTransactions: Transaction[],
  existingTransactions: Transaction[]
): Transaction[] {
  const existingIds = buildExternalIdSet(existingTransactions);
  
  return newTransactions.filter(tx => !existingIds.has(tx.external_id));
}

/**
 * Check if a transaction already exists
 * 
 * @param external_id - Open Banking transaction ID
 * @param existingTransactions - Array of transactions already in storage
 * @returns true if transaction exists, false otherwise
 */
export function transactionExists(
  external_id: string,
  existingTransactions: Transaction[]
): boolean {
  return existingTransactions.some(tx => tx.external_id === external_id);
}

/**
 * Merge new transactions with existing ones, avoiding duplicates
 * Preserves existing transactions and adds only new ones.
 * 
 * @param existingTransactions - Transactions already in storage
 * @param newTransactions - New transactions from Open Banking
 * @returns Merged array with no duplicates
 */
export function mergeTransactions(
  existingTransactions: Transaction[],
  newTransactions: Transaction[]
): Transaction[] {
  const uniqueNew = filterDuplicates(newTransactions, existingTransactions);
  return [...existingTransactions, ...uniqueNew];
}

/**
 * Validate that a transaction array has no duplicate external_ids
 * This is a safety check to ensure data integrity.
 * 
 * @param transactions - Array of transactions to validate
 * @throws Error if duplicates are found
 */
export function validateNoDuplicates(transactions: Transaction[]): void {
  const externalIds = transactions.map(tx => tx.external_id);
  const uniqueIds = new Set(externalIds);
  
  if (externalIds.length !== uniqueIds.size) {
    // Find duplicates for error message
    const duplicates: string[] = [];
    const seen = new Set<string>();
    
    for (const id of externalIds) {
      if (seen.has(id) && !duplicates.includes(id)) {
        duplicates.push(id);
      }
      seen.add(id);
    }
    
    throw new Error(
      `Duplicate external_ids found in transactions: ${duplicates.join(', ')}`
    );
  }
}
