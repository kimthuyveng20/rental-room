// src/lib/services/s3.service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
        ACL: "public-read"
      })
    );

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${uniqueFileName}`;
  }
}