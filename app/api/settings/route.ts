// app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';
import { PeriodType } from '@/src/types/BudgetPeriod';

/**
 * GET /api/settings
 * Returns current user settings (period type, anchor day)
 */
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
    const user = await storage.userStorage.getOrCreateUser();
    const settings = await storage.settingsStorage.getOrCreateSettings(user.user_id);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Updates user settings
 * 
 * Body: { period_type: "FIXED_DATE" | "INCOME_ANCHORED", anchor_day: 1-31 }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { period_type, anchor_day } = body;

    // Validation
    if (!period_type || (period_type !== PeriodType.FIXED_DATE && period_type !== PeriodType.INCOME_ANCHORED)) {
      return NextResponse.json(
        { error: 'Invalid period_type' },
        { status: 400 }
      );
    }

    if (!anchor_day || anchor_day < 1 || anchor_day > 31) {
      return NextResponse.json(
        { error: 'anchor_day must be between 1 and 31' },
        { status: 400 }
      );
    }

    const storage = await createStorageManager(session.accessToken);
    const user = await storage.userStorage.getOrCreateUser();
    const settings = await storage.settingsStorage.getOrCreateSettings(user.user_id);

    // Update settings
    settings.period_type = period_type;
    settings.anchor_day = anchor_day;

    await storage.settingsStorage.updateSettings(settings);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
