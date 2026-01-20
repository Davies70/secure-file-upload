import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../utils/s3Client.js';

export const handler = async (event) => {
  try {
    const { key } = event.queryStringParameters || {};

    if (!key) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin':
            'https://secure-file-processing-ui.vercel.app/',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'File key required' }),
      };
    }

    if (!key.startsWith('uploads/processed/')) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Invalid file path' }),
      };
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: 'attachment',
      }),
      { expiresIn: 300 },
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin':
          'https://secure-file-processing-ui.vercel.app',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ downloadUrl: url }),
    };
  } catch (err) {
    console.error('Download URL failed:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin':
          'https://secure-file-processing-ui.vercel.app',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'DOWNLOAD_URL_FAILED' }),
    };
  }
};
