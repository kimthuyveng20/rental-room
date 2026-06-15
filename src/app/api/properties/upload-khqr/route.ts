import { NextResponse } from 'next/server';
import { S3Service } from '@/src/lib/services/s3.service';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const s3 = S3Service.getInstance();

    const imageUrl =
      await s3.uploadKhqrImage(
        buffer,
        file.name,
        file.type
      );

    return NextResponse.json({
      url: imageUrl,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}