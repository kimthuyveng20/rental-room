// src/lib/services/s3.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3Service {
  private static instance: S3Service;
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  private constructor() {
    this.region = process.env.AWS_REGION!;
    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  // Singleton instance pattern to prevent re-initializing the client on every request
  public static getInstance(): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service();
    }
    return S3Service.instance;
  }

  /**
   * Uploads a raw file buffer directly to S3
   * @param buffer Raw binary data of the file
   * @param filename Cleaned destination filename
   * @param contentType MIME type of the file (e.g. image/jpeg)
   * @returns The public URL of the uploaded asset
   */
  public async uploadRawFile(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    const cleanFilename = filename.replace(/\s+/g, '-');
    const uniqueFileName = `tenants/${Date.now()}-${cleanFilename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: contentType,
        // 🚀 ACL removed here to fix the 'AccessControlListNotSupported' error
      })
    );

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uniqueFileName}`;
  }

   public async uploadKhqrImage(
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    const extension = filename.split('.').pop();

    const key = `khqr/${randomUUID()}.${extension}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  public getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  public async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // Generates a secure, temporary link
    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return signedUrl;
  }

  public extractKeyFromUrl(urlOrKey: string): string {
  if (!urlOrKey) return '';

  // If it's already just a key and not a URL, return it directly
  if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
    return urlOrKey;
  }

  try {
    const url = new URL(urlOrKey);
    // url.pathname will return something like "/khqr/178fa0c9-d721-41d5-8edd-9a777ba04807.jpg"
    // We use .pathname.substring(1) to remove the leading slash "/"
    return url.pathname.substring(1);
  } catch (error) {
    // Fallback safeguard in case URL parsing fails
    console.error('Failed to parse S3 URL:', error);
    return urlOrKey;
  }
}
}