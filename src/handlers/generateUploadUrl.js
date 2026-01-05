import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../utils/s3Client.js';
import crypto from 'crypto';

export const handler = async (event) => {
  try {
    let { fileName, fileType } = JSON.parse(event.body || '{}');

    // Provide default filename if none is given
    if (!fileName) {
      const defaultName = 'upload';
      const extension = fileType ? fileType.split('/')[1] : 'txt'; // derive extension from fileType if available
      fileName = `${defaultName}.${extension}`;
    }

    if (!fileType) {
      fileType = 'application/octet-stream'; // fallback generic binary type
    }

    const key = `uploads/original/${crypto.randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 60, // 1 minute
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl, key }),
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate upload URL' }),
    };
  }
};
