// app/api/period/active/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';

interface CategorySummary {
  category_id: string;
  name: string;
  monthly_limit: number;
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

    // Compute spending per category
    const categorySummaries: CategorySummary[] = await Promise.all(
      categories.map(async (category) => {
        const spent = await storage.periodStorage.getCategorySpending(
          periodData.period.period_id,
          category.category_id
        );

        return {
          category_id: category.category_id,
          name: category.name,
          monthly_limit: category.monthly_limit,
          spent,
          remaining: Math.max(0, category.monthly_limit - spent),
          percentage: category.monthly_limit > 0 
            ? Math.round((spent / category.monthly_limit) * 100)
            : 0,
        };
      })
    );

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
