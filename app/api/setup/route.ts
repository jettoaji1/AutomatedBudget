// app/api/setup/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';
import { PeriodType } from '@/src/types/BudgetPeriod';
import { formatDate } from '@/src/utils/dateUtils';

export async function POST() {
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

    // 4. Ensure active period exists (based on user settings, not "today")
    let currentPeriod = await storage.periodStorage.getCurrentPeriod(
      user.user_id,
      account.account_id
    );

    // Load settings (your /api/settings exists, so this storage should exist too)
    const settings = await storage.settingsStorage.getOrCreateSettings(user.user_id);

    // Anchor date = this month on anchor_day (used as reference for period calc)
    const now = new Date();
    const anchorDateThisMonth = new Date(now.getFullYear(), now.getMonth(), settings.anchor_day);
    const anchorDate = formatDate(anchorDateThisMonth);

    const startingBalance = 0;

    // If no current period exists, create it correctly
    if (!currentPeriod) {
      const newPeriod = await storage.periodStorage.createNextPeriod(
        user.user_id,
        account.account_id,
        settings.period_type,
        anchorDate,
        startingBalance
      );

      currentPeriod = await storage.periodStorage.getPeriod(newPeriod.period_id);
    } else {
      // If a period exists but was created with the wrong anchor (e.g. Dec 30), replace it
      // by creating a new correct period (old one remains as historical file).
      const { start_date: expectedStart, end_date: expectedEnd } = require('@/src/utils/dateUtils').calculatePeriodDates(
        new Date(),
        settings.period_type,
        require('@/src/utils/dateUtils').parseDate(anchorDate)
      );

      if (
        currentPeriod.period.start_date !== expectedStart ||
        currentPeriod.period.end_date !== expectedEnd
      ) {
        const newPeriod = await storage.periodStorage.createPeriod(
          user.user_id,
          account.account_id,
          expectedStart,
          expectedEnd,
          startingBalance,
          settings.period_type,
          anchorDate
        );

        currentPeriod = await storage.periodStorage.getPeriod(newPeriod.period_id);
      }
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
