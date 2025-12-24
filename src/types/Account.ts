// src/types/Account.ts

/**
 * Account entity
 * Represents a bank account connected via Open Banking.
 * Stored in: accounts/{account_id}.json
 * 
 * Note: V1 supports only ONE account per user.
 */
export interface Account {
  account_id: string;        // UUID format
  user_id: string;           // Foreign key to User
  bank_name: string;         // e.g., "Barclays"
  account_name: string;      // e.g., "Current Account"
  currency: string;          // ISO 4217 code, e.g., "GBP"
  created_at: string;        // ISO 8601 timestamp
}

/**
 * Creates a new Account object
 */
export function createAccount(
  user_id: string,
  bank_name: string,
  account_name: string,
  currency: string
): Account {
  return {
    account_id: crypto.randomUUID(),
    user_id,
    bank_name,
    account_name,
    currency,
    created_at: new Date().toISOString()
  };
}
