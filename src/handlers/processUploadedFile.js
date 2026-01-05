import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { s3 } from '../utils/s3Client.js';

export const handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);

    // Prevent infinite loop
    if (!key.startsWith('uploads/original/')) return;

    const extension = key.split('.').pop().toLowerCase();

    const file = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    const buffer = await streamToBuffer(file.Body);

    if (['jpg', 'jpeg', 'png'].includes(extension)) {
      await compressImage(bucket, key, buffer);
    }

    if (extension === 'pdf') {
      await compressPdf(bucket, key, buffer);
    }
  }
};

async function compressImage(bucket, key, buffer) {
  const optimized = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const newKey = key
    .replace('uploads/original/', 'uploads/processed/images/')
    .replace(/\.\w+$/, '.webp');

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: newKey,
      Body: optimized,
      ContentType: 'image/webp',
    })
  );
}

async function compressPdf(bucket, key, buffer) {
  const pdf = await PDFDocument.load(buffer);

  const compressed = await pdf.save({
    useObjectStreams: true,
    compress: true,
  });

  const newKey = key.replace('uploads/original/', 'uploads/processed/pdfs/');

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: newKey,
      Body: compressed,
      ContentType: 'application/pdf',
    })
  );
}

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};
