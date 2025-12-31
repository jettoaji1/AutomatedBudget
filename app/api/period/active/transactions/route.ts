// app/api/period/active/transactions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const storage = await createStorageManager(session.accessToken);

    // Get user and account
    const user = await storage.userStorage.getOrCreateUser();
    const account = await storage.accountStorage.getAccountForUser(user.user_id);
    
    if (!account) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 404 }
      );
    }

    // Get current period
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

    // Sort transactions by date (newest first)
    const sortedTransactions = [...periodData.transactions].sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    return NextResponse.json({
      transactions: sortedTransactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to get transactions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
