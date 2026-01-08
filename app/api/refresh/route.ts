// app/api/refresh/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';
import { TrueLayerClient } from '@/lib/openbanking/truelayer-client';
import { mapExternalToTransaction } from '@/lib/openbanking/map';
import { TrueLayerTokenStorage } from '@/src/storage/TrueLayerTokenStorage';

/**
 * POST /api/refresh
 */
export async function POST() {
  try {
    // 1) Auth
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2) Storage (Drive)
    const storage = await createStorageManager(session.accessToken);
    console.log('[REFRESH] Drive storage initialised');

    // 3) User + internal account (Drive)
    const user = await storage.userStorage.getOrCreateUser();
    const account = await storage.accountStorage.getAccountForUser(user.user_id);

    if (!account) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 });
    }

    // 4) Active period
    const periodData = await storage.periodStorage.getCurrentPeriod(
      user.user_id,
      account.account_id
    );

    if (!periodData) {
      return NextResponse.json({ error: 'No active period found' }, { status: 404 });
    }

    // 5) Default category
    const defaultCategory = await storage.categoryStorage.getDefaultCategory(user.user_id);
    if (!defaultCategory) {
      return NextResponse.json({ error: 'Default category not found' }, { status: 500 });
    }

    // 6) Load a VALID TrueLayer access token from Drive (auto refresh)
    const tokenStorage = new TrueLayerTokenStorage(storage.driveClient);

    let trueLayerAccessToken: string;
    try {
      trueLayerAccessToken = await tokenStorage.getValidAccessToken();
    } catch (e) {
      // tokens missing/expired/revoked => user must reconnect TrueLayer
      return NextResponse.json({ error: 'RECONNECT_REQUIRED' }, { status: 401 });
    }

    // 7) Init TrueLayer client (must use the access token)
    // IMPORTANT: Your TrueLayerClient must either accept token in ctor OR in fetch calls.
    const trueLayerClient = new TrueLayerClient(trueLayerAccessToken);

    // 8) Determine TrueLayer account id
    // Option A: if you already store it on your Drive account object, use it:
    // Replace these property names to match your Account type if needed.
    let trueLayerAccountId: string | undefined =
      (account as any).truelayer_account_id ||
      (account as any).external_account_id ||
      (account as any).provider_account_id;

    // Option B: If not stored yet, fetch accounts from TrueLayer and pick the first
    if (!trueLayerAccountId) {
      const accounts = await trueLayerClient.fetchAccounts();

      if (!accounts || accounts.length === 0) {
        return NextResponse.json(
          { error: 'No TrueLayer accounts found. Reconnect TrueLayer.' },
          { status: 401 }
        );
      }

      trueLayerAccountId = accounts[0].account_id;

      // If you have an update method, store it so next refresh is faster.
      // Uncomment and adapt if your AccountStorage supports updates:
      //
      // (account as any).truelayer_account_id = trueLayerAccountId;
      // await storage.accountStorage.updateAccount(account);
    }

    // 9) Fetch transactions from TrueLayer for current period date range
    const from = new Date(periodData.period.start_date);
    const periodEnd = new Date(periodData.period.end_date);
    const now = new Date();
    const to = periodEnd > now ? now : periodEnd;

    const externalTransactions = await trueLayerClient.fetchTransactions(
      trueLayerAccountId,
      from.toISOString(),
      to.toISOString()
    );

    // 10) Map -> internal
    const mappingContext = {
      userId: user.user_id,
      accountId: account.account_id,
      periodId: periodData.period.period_id,
      defaultCategoryId: defaultCategory.category_id,
    };

    const internalTransactions = externalTransactions.map((tx: any) =>
      mapExternalToTransaction(tx, mappingContext)
    );

    // 11) Upsert (dedupe)
    const inserted = await storage.periodStorage.addTransactions(
      periodData.period.period_id,
      internalTransactions
    );

    const attempted = internalTransactions.length;
    const deduped = attempted - inserted;

    return NextResponse.json({
      inserted,
      deduped,
      lastRefreshedAt: new Date().toISOString(),
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