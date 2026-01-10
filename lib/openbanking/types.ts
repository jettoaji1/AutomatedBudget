// lib/openbanking/types.ts

/**
 * External transaction from Open Banking provider
 * Normalized format before mapping to internal Transaction type
 */
export type ExternalTransaction = {
  external_id: string;
  date: string;        // ISO date (YYYY-MM-DD)
  amount: number;      // signed number (negative = expense, positive = income)
  description: string;
  transaction_type?: string;
};

/**
 * Open Banking client interface
 * Abstracts provider-specific implementation (TrueLayer, Plaid, etc.)
 */
export interface OpenBankingClient {
  fetchTransactions(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<ExternalTransaction[]>;
}
