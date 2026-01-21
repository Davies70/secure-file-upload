import { getFileMetadata } from '../utils/dynamodbClient.js';

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

export const handler = async (event) => {
  try {
    const { fileId } = event.queryStringParameters || {};

    if (!fileId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': resolveCorsOrigin(event),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'File ID required' }),
      };
    }

    const metadata = await getFileMetadata(fileId);

    if (!metadata) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': resolveCorsOrigin(event),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'File metadata not found' }),
      };
    }

    // Remove TTL from response
    const { expiresAt, ...responseData } = metadata;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': resolveCorsOrigin(event),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseData),
    };
  } catch (err) {
    console.error('Get file metadata failed:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': resolveCorsOrigin(event),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'GET_METADATA_FAILED' }),
    };
  }
};
