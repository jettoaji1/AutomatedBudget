// app/api/setup/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';
import { PeriodType } from '@/src/types/BudgetPeriod';
import { formatDate } from '@/src/utils/dateUtils';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });}
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const storage = await createStorageManager(session.accessToken);

    // 1. Get or create user
    const user = await storage.userStorage.getOrCreateUser();

    // 2. Get or create account (V1: single account only)
    let account = await storage.accountStorage.getAccountForUser(user.user_id);
    
    if (!account) {
      account = await storage.accountStorage.createAccount(
        user.user_id,
        'Placeholder Bank',
        'Current Account',
        'GBP'
      );
    }

    // 3. Initialize categories (ensures default "Other" exists)
    const categories = await storage.categoryStorage.initializeCategories(user.user_id);

    // 4. Ensure active period exists
    let currentPeriod = await storage.periodStorage.getCurrentPeriod(
      user.user_id,
      account.account_id
    );

    if (!currentPeriod) {
      const periodType = PeriodType.FIXED_DATE;
      const anchorDate = formatDate(new Date());
      const startingBalance = 0;

      const newPeriod = await storage.periodStorage.createNextPeriod(
        user.user_id,
        account.account_id,
        periodType,
        anchorDate,
        startingBalance
      );

      currentPeriod = await storage.periodStorage.getPeriod(newPeriod.period_id);
    }

    return NextResponse.json({
      success: true,
      user_id: user.user_id,
      account_id: account.account_id,
      period_id: currentPeriod?.period.period_id,
      categories_count: categories.length,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Setup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
