import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';

let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    const config = { region: REGION };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    s3Client = new S3Client(config);
  }
  return s3Client;
}

/**
 * Stores an employee's profile photo.
 * If AWS S3 is configured, uploads to S3 bucket.
 * Otherwise, saves to local disk in /uploads/profile-photos/.
 * Returns the public URL or relative path to be saved in the database.
 */
export async function saveProfilePhoto(employeeId, imageBase64) {
  if (!imageBase64) return null;

  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const buffer = Buffer.from(base64Data, 'base64');
  const filename = `emp_${employeeId}_${Date.now()}.jpg`;

  // 1. If S3 Bucket is configured, upload to S3
  if (S3_BUCKET) {
    try {
      const s3 = getS3Client();
      const s3Key = `profile-photos/${filename}`;
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: 'image/jpeg',
      }));

      // CloudFront or S3 direct URL
      const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
      const photoUrl = cdnDomain
        ? `https://${cdnDomain}/${s3Key}`
        : `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;
      return photoUrl;
    } catch (s3Err) {
      console.warn('S3 upload warning, falling back to local file storage:', s3Err.message);
    }
  }

  // 2. Local fallback storage
  const uploadsDir = path.resolve(__dirname, '../../../uploads/profile-photos');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/profile-photos/${filename}`;
}
