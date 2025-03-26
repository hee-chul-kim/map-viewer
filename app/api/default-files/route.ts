import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const pointDir = path.join(process.cwd(), 'public');
    const files = await fs.readdir(pointDir);

    // .shp와 .dbf 파일 필터링
    const shpFiles = files.filter((file) => file.endsWith('.shp'));
    const dbfFiles = files.filter((file) => file.endsWith('.dbf'));

    return NextResponse.json({
      shp: shpFiles,
      dbf: dbfFiles,
    });
  } catch (error) {
    console.error('Error reading point directory:', error);
    return NextResponse.json({ error: 'Failed to read files' }, { status: 500 });
  }
}
