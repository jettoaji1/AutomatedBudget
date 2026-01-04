// lib/openbanking/truelayer-client.ts

import { OpenBankingClient, ExternalTransaction } from './types';

/**
 * TrueLayer API response types
 */
interface TrueLayerTransaction {
  transaction_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  description: string;
  merchant_name?: string;
  transaction_type: string;
  transaction_category?: string;
}

interface TrueLayerTransactionsResponse {
  results: TrueLayerTransaction[];
  status?: string;
}

/**
 * TrueLayer Open Banking client (Sandbox)
 * 
 * Uses manual access token for Phase 2B.
 * Requires environment variables:
 * - TRUELAYER_CLIENT_ID
 * - TRUELAYER_CLIENT_SECRET
 * - TRUELAYER_ACCESS_TOKEN (manual sandbox token)
 * - TRUELAYER_ENV (should be 'sandbox')
 */
export class TrueLayerClient implements OpenBankingClient {
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.TRUELAYER_ACCESS_TOKEN || '';
    const env = process.env.TRUELAYER_ENV || 'sandbox';
    this.baseUrl = env === 'sandbox' 
      ? 'https://api.truelayer-sandbox.com'
      : 'https://api.truelayer.com';

    if (!this.accessToken) {
      throw new Error('TRUELAYER_ACCESS_TOKEN not configured');
    }
  }

  /**
   * Fetch transactions from TrueLayer for date range
   * 
   * @param accountId - TrueLayer account ID
   * @param startDate - ISO date string (YYYY-MM-DD)
   * @param endDate - ISO date string (YYYY-MM-DD)
   * @returns Array of normalized external transactions
   */
  async fetchTransactions(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<ExternalTransaction[]> {
    
    // TrueLayer API: GET /data/v1/accounts/{account_id}/transactions
    const url = new URL(`${this.baseUrl}/data/v1/accounts/${accountId}/transactions`);
    url.searchParams.set('from', startDate);
    url.searchParams.set('to', endDate);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('RECONNECT_REQUIRED');
      }
      const errorText = await response.text();
      throw new Error(`TrueLayer API error (${response.status}): ${errorText}`);
    }

    const data: TrueLayerTransactionsResponse = await response.json();

    // Normalize to our ExternalTransaction format
    return data.results.map(tx => this.normalizeTransaction(tx));
  }

  /**
   * Normalize TrueLayer transaction to our format
   */
  private normalizeTransaction(tx: TrueLayerTransaction): ExternalTransaction {
    
    const date = tx.timestamp ?? new Date().toISOString();

    // Use TrueLayer's unique transaction identifier
    const providerId =
      (tx as any).transaction_id ??
      (tx as any).id;

    if (!providerId) {
      throw new Error("TrueLayer transaction missing provider ID");
    }

    return {
      external_id: `truelayer|${providerId}`,
      date,
      amount: tx.amount,
      merchant_name: tx.merchant_name,
      description: tx.description || "No description",
    };
  }


}
