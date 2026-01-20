import { getFileMetadata } from '../utils/dynamodbClient.js';

export const handler = async (event) => {
  try {
    const { fileId } = event.queryStringParameters || {};

    if (!fileId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin':
            'https://secure-file-processing-ui.vercel.app/',
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
          'Access-Control-Allow-Origin':
            'https://secure-file-processing-ui.vercel.app/',
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
        'Access-Control-Allow-Origin':
          'https://secure-file-processing-ui.vercel.app',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseData),
    };
  } catch (err) {
    console.error('Get file metadata failed:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin':
          'https://secure-file-processing-ui.vercel.app',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'GET_METADATA_FAILED' }),
    };
  }
};
