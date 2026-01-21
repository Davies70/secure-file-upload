import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { s3 } from '../utils/s3Client.js';
import { createFileMetadata } from '../utils/dynamodbClient.js';

const ALLOWED_CORS_ORIGINS = new Set([
  'https://secure-file-processing-ui.vercel.app',
  'http://localhost:3000',
]);

function resolveCorsOrigin(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  if (!origin) return 'https://secure-file-processing-ui.vercel.app';
  const cleaned = origin.replace(/\/$/, '');
  return ALLOWED_CORS_ORIGINS.has(cleaned)
    ? cleaned
    : 'https://secure-file-processing-ui.vercel.app';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function sanitizeFileName(name = 'upload') {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function validateInput({ fileType, fileSize }) {
  if (!ALLOWED_TYPES.has(fileType)) {
    throw Object.assign(new Error('Unsupported file type'), {
      statusCode: 400,
      code: 'UNSUPPORTED_FILE_TYPE',
    });
  }

  if (
    typeof fileSize !== 'number' ||
    fileSize <= 0 ||
    fileSize > MAX_FILE_SIZE
  ) {
    throw Object.assign(new Error('Invalid file size'), {
      statusCode: 400,
      code: 'INVALID_FILE_SIZE',
    });
  }
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, fileType, fileSize } = body;

    validateInput({ fileType, fileSize });

    const fileId = crypto.randomUUID();
    const safeName = sanitizeFileName(fileName || 'upload');

    /**
     * IMPORTANT:
     * uploads/original/{fileId}/{filename}
     */
    const key = `uploads/original/${fileId}/${safeName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      ContentType: fileType, // optional but OK
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 360, // 6 minutes
    });

    // Create metadata record in DynamoDB
    await createFileMetadata(fileId, { fileType, fileSize, fileName });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': resolveCorsOrigin(event),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadUrl,
        key,
        fileId,
      }),
    };
  } catch (err) {
    console.error('Generate upload URL failed:', err);

    return {
      statusCode: err.statusCode || 500,
      headers: {
        'Access-Control-Allow-Origin': resolveCorsOrigin(event),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: err.code || 'UPLOAD_URL_FAILED',
        message: err.message || 'Failed to generate upload URL',
      }),
    };
  }
};
