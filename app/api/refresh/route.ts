// app/api/refresh/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';
import { TrueLayerClient } from '@/lib/openbanking/truelayer-client';
import { mapExternalToTransaction } from '@/lib/openbanking/map';

/**
 * POST /api/refresh
 * 
 * Fetches new transactions from TrueLayer and upserts them into the active period.
 * Transactions are deduplicated by external_id.
 * 
 * Response:
 * - 200: { inserted, deduped, lastRefreshedAt }
 * - 401: Not authenticated
 * - 400: { error: "RECONNECT_REQUIRED" } if TrueLayer auth fails
 * - 404: No active period or account found
 * - 500: Other errors
 */
export async function POST() {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Initialize storage
    const storage = await createStorageManager(session.accessToken);

    // 3. Get user and account
    const user = await storage.userStorage.getOrCreateUser();
    const account = await storage.accountStorage.getAccountForUser(user.user_id);
    
    if (!account) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 404 }
      );
    }

    // 4. Get active period
    const periodData = await storage.periodStorage.getCurrentPeriod(
      user.user_id,
      account.account_id
    );

    if (!periodData) {
      return NextResponse.json(
        { error: 'No active period found' },
        { status: 404 }
      );
    }

    // 5. Get default "Other" category
    const defaultCategory = await storage.categoryStorage.getDefaultCategory(user.user_id);
    
    if (!defaultCategory) {
      return NextResponse.json(
        { error: 'Default category not found' },
        { status: 500 }
      );
    }

    // 6. Initialize TrueLayer client
    const trueLayerAccountId = process.env.TRUELAYER_ACCOUNT_ID;
    
    if (!trueLayerAccountId) {
      return NextResponse.json(
        { error: 'TRUELAYER_ACCOUNT_ID not configured' },
        { status: 500 }
      );
    }

    let trueLayerClient: TrueLayerClient;
    try {
      trueLayerClient = new TrueLayerClient();
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'TrueLayer client initialization failed' },
        { status: 500 }
      );
    }

    // 7. Fetch transactions from TrueLayer
    let externalTransactions;
    const from = new Date(periodData.period.start_date);
    const periodEnd = new Date(periodData.period.end_date);
    const now = new Date();

    const to = periodEnd > now ? now : periodEnd;

    try {
      externalTransactions = await trueLayerClient.fetchTransactions(
        trueLayerAccountId,
        from.toISOString(),
        to.toISOString()
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'RECONNECT_REQUIRED') {
        return NextResponse.json(
          { error: 'RECONNECT_REQUIRED' },
          { status: 401 }
        );
      }
      throw error;
    }

    // 8. Map to internal Transaction format
    const mappingContext = {
      userId: user.user_id,
      accountId: account.account_id,
      periodId: periodData.period.period_id,
      defaultCategoryId: defaultCategory.category_id,
    };

    const internalTransactions = externalTransactions.map(tx =>
      mapExternalToTransaction(tx, mappingContext)
    );

    // 9. Upsert transactions (dedupe by external_id)
    const inserted = await storage.periodStorage.addTransactions(
      periodData.period.period_id,
      internalTransactions
    );

    const attempted = internalTransactions.length;
    const deduped = attempted - inserted;

    // 10. Return results
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
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
