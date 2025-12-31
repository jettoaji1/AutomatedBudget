// app/api/categories/route.ts
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
    const user = await storage.userStorage.getOrCreateUser();
    const categories = await storage.categoryStorage.getActiveCategories(user.user_id);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to get categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { name, monthly_limit } = await request.json();

    if (!name || monthly_limit === undefined) {
      return NextResponse.json(
        { error: 'name and monthly_limit are required' },
        { status: 400 }
      );
    }

    const storage = await createStorageManager(session.accessToken);
    const user = await storage.userStorage.getOrCreateUser();
    
    const newCategory = await storage.categoryStorage.createCategory(
      user.user_id,
      name,
      Number(monthly_limit)
    );

    return NextResponse.json({ category: newCategory });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
