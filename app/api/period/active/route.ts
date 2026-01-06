// app/api/period/active/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';

interface CategorySummary {
  category_id: string;
  name: string;
  monthly_limit: number | null;
  spent: number;
  remaining: number;
  percentage: number;
}

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
        { error: 'No account found. Run setup first.' },
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
        { error: 'No active period found. Run setup first.' },
        { status: 404 }
      );
    }

    // Get all categories
    const categories = await storage.categoryStorage.getActiveCategories(user.user_id);

    // Compute spending per category in ONE pass (fast)
// Assumes periodData includes transactions (most likely does if your period JSON has transactions array)
    const transactions = (periodData as any).transactions ?? [];

    const spentByCategory: Record<string, number> = {};

    for (const tx of transactions) {
      const catId = tx.category_id;
      if (!catId) continue;

      // You store spending as negative numbers (e.g. -30). Convert to positive spend.
      const spend = typeof tx.amount === 'number' && tx.amount < 0 ? Math.abs(tx.amount) : 0;

      spentByCategory[catId] = (spentByCategory[catId] ?? 0) + spend;
    }

    const categorySummaries: CategorySummary[] = categories.map((category) => {
      const spent = spentByCategory[category.category_id] ?? 0;
      const limit = category.monthly_limit; // number | null

      return {
        category_id: category.category_id,
        name: category.name,
        monthly_limit: limit,
        spent,
        remaining: limit === null ? 0 : limit - spent,
        percentage:
          limit === null
            ? 0
            : limit === 0
              ? spent > 0 ? 100 : 0
              : Math.round((spent / limit) * 100),
      };
    });

    return NextResponse.json({
      period: periodData.period,
      category_summaries: categorySummaries,
    });
  } catch (error) {
    console.error('Get active period error:', error);
    return NextResponse.json(
      { error: 'Failed to get period data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
