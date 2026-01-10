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
 * Clean up bank transaction descriptions.
 *
 * Rules:
 * 1) If description contains " ON " → remove everything from " ON " onwards
 * 2) Otherwise, remove everything from the first occurrence of " <number>"
 *    (space followed by a digit), to strip dates/times/codes
 */
function cleanDescription(raw: string): string {
  if (!raw) return 'No description';

  const upper = raw.toUpperCase();

  // Rule 1: explicit " ON "
  const onIndex = upper.indexOf(' ON ');
  if (onIndex !== -1) {
    return raw.slice(0, onIndex).trim();
  }

  // Rule 2: first space followed by a digit
  const digitMatch = raw.match(/\s\d/);
  if (digitMatch && digitMatch.index !== undefined) {
    return raw.slice(0, digitMatch.index).trim();
  }

  return raw.trim();
}

/**
 * Map external Open Banking transaction to internal Transaction type
 */
export function mapExternalToTransaction(
  tx: ExternalTransaction,
  context: MappingContext
): Transaction {
  const cleanedDescription = cleanDescription(tx.description);

  return createTransaction(
    tx.external_id,
    context.accountId,
    context.userId,
    context.periodId,
    tx.date,
    tx.amount,
    cleanedDescription,
    context.defaultCategoryId,
    null
  );
}