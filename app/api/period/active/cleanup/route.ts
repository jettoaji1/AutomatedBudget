import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const storage = await createStorageManager(session.accessToken);

  const user = await storage.userStorage.getOrCreateUser();
  const account = await storage.accountStorage.getAccountForUser(user.user_id);
  if (!account) return NextResponse.json({ error: 'No account found' }, { status: 404 });

	const periodData = await storage.periodStorage.getCurrentPeriod(
		user.user_id,
		account.account_id
	);
	if (!periodData) {
		return NextResponse.json({ error: 'No active period found' }, { status: 404 });
	}

	const start = new Date(periodData.period.start_date).getTime();
	const end = new Date(periodData.period.end_date).getTime();

	const before = periodData.transactions.length;

	periodData.transactions = periodData.transactions.filter(tx => {
		// 1) Remove sandbox/fake transactions
		if (tx.external_id?.includes('sandbox')) return false;

		// 2) Keep only transactions inside the active period
		const t = new Date(tx.date).getTime();
		return t >= start && t < end;
	});

	await storage.periodStorage.savePeriodData(periodData);

	return NextResponse.json({
		removed: before - periodData.transactions.length,
		remaining: periodData.transactions.length,
		period: periodData.period,
	});

}