// app/api/refresh/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';
import { TrueLayerClient } from '@/lib/openbanking/truelayer-client';
import { mapExternalToTransaction } from '@/lib/openbanking/map';
import { TrueLayerTokenStorage } from '@/src/storage/TrueLayerTokenStorage';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const storage = await createStorageManager(session.accessToken);

    const user = await storage.userStorage.getOrCreateUser();
    const account = await storage.accountStorage.getAccountForUser(user.user_id);

    if (!account) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 });
    }

    const periodData = await storage.periodStorage.getCurrentPeriod(
      user.user_id,
      account.account_id
    );

    if (!periodData) {
      return NextResponse.json({ error: 'No active period found' }, { status: 404 });
    }

    const defaultCategory = await storage.categoryStorage.getDefaultCategory(user.user_id);
    if (!defaultCategory) {
      return NextResponse.json({ error: 'Default category not found' }, { status: 500 });
    }

    const tokenStorage = new TrueLayerTokenStorage(storage.driveClient);

    let trueLayerAccessToken: string;
    try {
      trueLayerAccessToken = await tokenStorage.getValidAccessToken();
    } catch {
      return NextResponse.json({ error: 'RECONNECT_REQUIRED' }, { status: 401 });
    }

    const trueLayerClient = new TrueLayerClient(trueLayerAccessToken);

    let trueLayerAccountId: string | undefined =
      (account as any).truelayer_account_id ||
      (account as any).external_account_id ||
      (account as any).provider_account_id;

    if (!trueLayerAccountId) {
      const accounts = await trueLayerClient.fetchAccounts();
      if (!accounts || accounts.length === 0) {
        return NextResponse.json(
          { error: 'No TrueLayer accounts found. Reconnect TrueLayer.' },
          { status: 401 }
        );
      }
      trueLayerAccountId = accounts[0].account_id;
    }

    const from = new Date(periodData.period.start_date);
    const periodEnd = new Date(periodData.period.end_date);
    const now = new Date();
    const to = periodEnd > now ? now : periodEnd;

    const externalTransactions = await trueLayerClient.fetchTransactions(
      trueLayerAccountId,
      from.toISOString(),
      to.toISOString()
    );

    //  NEW: set starting balance = current balance - net change (MVP)
    // Net change uses signed amounts: income positive, spending negative
    const currentBalance = await trueLayerClient.fetchCurrentBalance(trueLayerAccountId);
    const netChange = externalTransactions.reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
    const computedStartingBalance = currentBalance - netChange;

    periodData.period.starting_balance = Number(computedStartingBalance.toFixed(2));

    // Persist the updated period metadata (and later, transactions)
    await storage.periodStorage.savePeriodData(periodData);

    const mappingContext = {
      userId: user.user_id,
      accountId: account.account_id,
      periodId: periodData.period.period_id,
      defaultCategoryId: defaultCategory.category_id,
    };

    const internalTransactions = externalTransactions.map((tx: any) =>
      mapExternalToTransaction(tx, mappingContext)
    );

    const inserted = await storage.periodStorage.addTransactions(
      periodData.period.period_id,
      internalTransactions
    );

    const attempted = internalTransactions.length;
    const deduped = attempted - inserted;

    //  Persist last refresh timestamp (for auto-refresh logic)
    const settings = await storage.settingsStorage.getOrCreateSettings(user.user_id);
    const nowIso = new Date().toISOString();
    settings.last_refreshed_at = nowIso;
    await storage.settingsStorage.updateSettings(settings);

    return NextResponse.json({
      inserted,
      deduped,
      lastRefreshedAt: nowIso,
      currentBalance,
      computedStartingBalance: periodData.period.starting_balance,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh transactions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}