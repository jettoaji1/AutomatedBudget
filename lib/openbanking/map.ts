// lib/openbanking/map.ts

import { ExternalTransaction } from './types';
import { Transaction, createTransaction } from '@/src/types/Transaction';

/**
 * Mapping context required to create internal Transaction
 */
export interface MappingContext {
  userId: string;
  accountId: string;
  periodId: string;
  defaultCategoryId: string;
}

/**
 * Map external Open Banking transaction to internal Transaction type
 * 
 * Uses createTransaction helper to ensure all required fields are set correctly.
 * All new transactions default to "Other" category (defaultCategoryId).
 * 
 * @param tx - External transaction from Open Banking provider
 * @param context - Required IDs for transaction creation
 * @returns Internal Transaction object
 */
export function mapExternalToTransaction(
  tx: ExternalTransaction,
  context: MappingContext
): Transaction {
  
  return createTransaction(
    tx.external_id,
    context.accountId,
    context.userId,
    context.periodId,
    tx.date,
    tx.amount,
    tx.merchant_name || 'Unknown',
    tx.description,
    context.defaultCategoryId,
    null  // original_category - TrueLayer doesn't provide reliable categorization
  );
}
