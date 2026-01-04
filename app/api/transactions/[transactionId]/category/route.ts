// app/api/transactions/[transactionId]/category/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';

type RouteContext = {
  params: Promise<{ transactionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { transactionId } = await context.params;

  // ...rest of your handler stays the same

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { category_id } = await request.json();

    if (!category_id) {
      return NextResponse.json(
        { error: 'category_id is required' },
        { status: 400 }
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

    // Verify category exists
    const category = await storage.categoryStorage.getCategory(category_id);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Find transaction in period
    const transaction = periodData.transactions.find(
      tx => tx.transaction_id === transactionId
    );

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found in current period' },
        { status: 404 }
      );
    }

    // Preserve original category on first manual change
    if (transaction.original_category === null && !transaction.is_manual_override) {
      transaction.original_category = transaction.category_id;
    }

    // Update transaction
    transaction.category_id = category_id;
    transaction.is_manual_override = true;
    transaction.updated_at = new Date().toISOString();

    // Save updated period back to Drive
    await storage.periodStorage.updateTransactionCategory(
      periodData.period.period_id,
      transactionId,
      category_id
    );

    return NextResponse.json({ 
      transaction: {
        transaction_id: transaction.transaction_id,
        category_id: transaction.category_id,
        is_manual_override: transaction.is_manual_override,
        updated_at: transaction.updated_at,
      }
    });
  } catch (error) {
    console.error('Update transaction category error:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
