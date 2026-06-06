import { NextResponse } from 'next/server';
import { S3Service } from '@/src/lib/services/s3.service';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || 'application/octet-stream';
    const filename = req.headers.get('x-filename') || 'uploaded-file';
    const uploadPurpose = req.headers.get('x-upload-purpose') || 'avatar'; // 'avatar' | 'id-document'

    // 1. Read the raw binary stream
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'Empty file payload' }, { status: 400 });
    }
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to S3 via Service
    const s3Service = S3Service.getInstance();
    
    // Namespace files in S3 buckets based on purpose
    const s3Folder = uploadPurpose === 'id-document' ? 'identifications' : 'avatars';
    const cleanFilename = `${s3Folder}/${Date.now()}-${filename.replace(/\s+/g, '-')}`;
    
    const fileUrl = await s3Service.uploadRawFile(buffer, cleanFilename, contentType);

    // Return the generated S3 URL link back to the frontend form instance
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('API_UPLOAD_ROUTE_ERROR:', error);
    return NextResponse.json({ error: 'Failed uploading asset to storage' }, { status: 500 });
  }
}