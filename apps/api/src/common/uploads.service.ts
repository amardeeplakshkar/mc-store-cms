import { BadRequestException, Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

@Injectable()
export class UploadsService {
  private client = new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' },
  });

  async uploadImage(storeId: string, file: Express.Multer.File, kind: string) {
    if (!file) throw new BadRequestException('No file');
    if (!ALLOWED.includes(file.mimetype)) throw new BadRequestException('Only images are allowed');
    if (file.size > 3 * 1024 * 1024) throw new BadRequestException('Max 3 MB');
    const ext = file.originalname.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const key = `stores/${storeId}/${kind.replace(/[^a-z-]/g, '') || 'file'}/${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`;
    await this.client.send(
      new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype, CacheControl: 'public, max-age=31536000' }),
    );
    return { url: `${process.env.S3_PUBLIC_BASE_URL}/${key}` };
  }
}
