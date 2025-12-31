// app/api/categories/[categoryId]/archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createStorageManager } from '@/lib/drive-server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const { categoryId } = await params;
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const storage = await createStorageManager(session.accessToken);

    // Get category
    const category = await storage.categoryStorage.getCategory(categoryId);
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Block archiving default "Other" category
    if (category.is_default) {
      return NextResponse.json(
        { error: 'Cannot archive the default "Other" category' },
        { status: 400 }
      );
    }

    await storage.categoryStorage.archiveCategory(categoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Archive category error:', error);
    return NextResponse.json(
      { error: 'Failed to archive category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
