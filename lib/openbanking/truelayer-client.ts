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

type TrueLayerAccount = {
  account_id: string;
  account_type?: string;
  display_name?: string;
  currency?: string;
};

type TrueLayerAccountsResponse = {
  results: TrueLayerAccount[];
};

type TrueLayerBalance = {
  currency: string;
  available?: number;
  current?: number;
  overdraft?: number;
  update_timestamp?: string;
};

type TrueLayerBalanceResponse = {
  results: TrueLayerBalance[];
};

export class TrueLayerClient implements OpenBankingClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;

    const env = process.env.TRUELAYER_ENV || 'sandbox';
    this.baseUrl =
      env === 'sandbox'
        ? 'https://api.truelayer-sandbox.com'
        : 'https://api.truelayer.com';

    if (!this.accessToken) {
      throw new Error('TrueLayer access token missing');
    }
  }

  async fetchAccounts(): Promise<TrueLayerAccount[]> {
    const url = `${this.baseUrl}/data/v1/accounts`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('RECONNECT_REQUIRED');
      }
      const errorText = await response.text();
      throw new Error(`TrueLayer API error (${response.status}): ${errorText}`);
    }

    const data: TrueLayerAccountsResponse = await response.json();
    return data.results ?? [];
  }

  /**
   * Fetch current balance for an account
   * GET /data/v1/accounts/{account_id}/balance
   */
  async fetchCurrentBalance(accountId: string): Promise<number> {
    const url = `${this.baseUrl}/data/v1/accounts/${accountId}/balances`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('RECONNECT_REQUIRED');
      }
      const errorText = await response.text();
      throw new Error(`TrueLayer API error (${response.status}): ${errorText}`);
    }

    const data: TrueLayerBalanceResponse = await response.json();
    const first = data.results?.[0];

    const current = first?.current;
    const available = first?.available;

    if (typeof current === 'number') return current;
    if (typeof available === 'number') return available;

    throw new Error('TrueLayer balance response missing current/available');
  }

  async fetchTransactions(
    accountId: string,
    startDate: string,
    endDate: string
  ): Promise<ExternalTransaction[]> {
    const url = new URL(`${this.baseUrl}/data/v1/accounts/${accountId}/transactions`);
    url.searchParams.set('from', startDate);
    url.searchParams.set('to', endDate);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
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
    return (data.results ?? []).map((tx) => this.normalizeTransaction(tx));
  }

  private normalizeTransaction(tx: TrueLayerTransaction): ExternalTransaction {
    const date = tx.timestamp ?? new Date().toISOString();

    const providerId = (tx as any).transaction_id ?? (tx as any).id;
    if (!providerId) {
      throw new Error('TrueLayer transaction missing provider ID');
    }

    // Normalize sign based on transaction_type
    // - DEBIT = money out (spend) => negative
    // - CREDIT = money in (income) => positive
    const raw = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount);
    const abs = Math.abs(raw);

    const normalizedAmount =
      tx.transaction_type === 'DEBIT' ? -abs :
      tx.transaction_type === 'CREDIT' ? abs :
      raw; // fallback if unknown

    return {
      external_id: `truelayer|${providerId}`,
      date,
      amount: normalizedAmount,
      merchant_name: tx.merchant_name,
      description: tx.description || 'No description',
      transaction_type: tx.transaction_type, // optional but useful later
    };
  }
}