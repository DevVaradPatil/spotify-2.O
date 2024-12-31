import { NextRequest, NextResponse } from 'next/server';
import getSongsByTitle from '@/actions/getSongsByTitle';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }

  try {
    const songs = await getSongsByTitle(title);
    return NextResponse.json(songs, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}
