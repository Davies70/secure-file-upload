import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { s3 } from '../utils/s3Client.js';
import streamToBuffer from '../utils/streamToBuffer.js';
import { updateFileStatus } from '../utils/dynamodbClient.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function processImage(buffer, fileId) {
  const optimized = await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    buffer: optimized,
    key: `uploads/processed/images/${fileId}.webp`,
    contentType: 'image/webp',
  };
}

// async function processImage(buffer, fileId) {
//   const image = sharp(buffer).resize({
//     width: 1200,
//     withoutEnlargement: true,
//   });

//   let optimized;
//   let key;
//   let contentType;

//   try {
//     optimized = await image.avif({ quality: 50 }).toBuffer();
//     key = `uploads/processed/images/${fileId}.avif`;
//     contentType = 'image/avif';
//   } catch {
//     optimized = await image.webp({ quality: 80 }).toBuffer();
//     key = `uploads/processed/images/${fileId}.webp`;
//     contentType = 'image/webp';
//   }

//   return { buffer: optimized, key, contentType };
// }


async function processPdf(buffer, fileId) {
  const pdf = await PDFDocument.load(buffer);
  const compressed = await pdf.save({
    useObjectStreams: true,
    compress: true,
  });

  return {
    buffer: compressed,
    key: `uploads/processed/pdfs/${fileId}.pdf`,
    contentType: 'application/pdf',
  };
}

export const handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;

    if (!key.startsWith('uploads/original/')) continue;

    /**
     * uploads/original/{fileId}/{filename}
     */
    const [, , fileId] = key.split('/');
    if (!fileId) continue;

    try {
      const file = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );

      if (file.ContentLength > MAX_FILE_SIZE) {
        console.warn(`File too large, skipping: ${key}`);
        continue;
      }

      const buffer = await streamToBuffer(file.Body);
      const contentType = file.ContentType || '';
      const originalFileSize = file.ContentLength;

      let result;

      if (contentType.startsWith('image/')) {
        result = await processImage(buffer, fileId);
      } else if (contentType === 'application/pdf') {
        result = await processPdf(buffer, fileId);
      } else {
        console.warn(`Unsupported content type: ${contentType}`);
        continue;
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: result.key,
          Body: result.buffer,
          ContentType: result.contentType,
        }),
      );

      console.log(`Processed file written: ${result.key}`);

      // Calculate compression ratio
      const compressedSize = result.buffer.length;
      const compressionRatio = (
        (1 - compressedSize / originalFileSize) *
        100
      ).toFixed(2);

      // Update metadata status to COMPLETED
      await updateFileStatus(fileId, {
        status: 'COMPLETED',
        metadata: {
          processedKey: result.key,
          contentType: result.contentType,
          originalFileSize,
          compressedFileSize: compressedSize,
          compressionRatio: parseFloat(compressionRatio),
          processedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error(`Processing failed for ${key}`, err);

      // Update metadata status to FAILED
      await updateFileStatus(fileId, {
        status: 'FAILED',
        metadata: {
          error: err.message,
          failedAt: new Date().toISOString(),
        },
      }).catch((dbErr) => {
        console.error(
          `Failed to update metadata to FAILED for ${fileId}`,
          dbErr,
        );
      });
    }
  }
};
