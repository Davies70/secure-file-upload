import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  maxAttempts: 3,
});

export const dynamoDB = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export async function createFileMetadata(
  fileId,
  { fileType, fileSize, fileName },
) {
  return dynamoDB.send(
    new PutCommand({
      TableName: process.env.METADATA_TABLE,
      Item: {
        fileId,
        status: 'PENDING',
        fileType,
        fileSize,
        fileName,
        uploadedAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days TTL
      },
    }),
  );
}

/**
 * Updates file status and optionally adds metadata fields
 * @param {string} fileId - The file ID
 * @param {Object} updates - Fields to update
 * @param {string} updates.status - New status (PROCESSING, COMPLETED, FAILED)
 * @param {Object} updates.metadata - Additional metadata to merge (e.g., { processedKey, contentType })
 *
 * EXAMPLE USAGE:
 * updateFileStatus(fileId, {
 *   status: 'COMPLETED',
 *   metadata: { processedKey: 'uploads/processed/images/123.webp', contentType: 'image/webp' }
 * })
 *
 * RESULT IN DYNAMODB:
 * {
 *   fileId: '123',
 *   status: 'COMPLETED',
 *   updatedAt: '2026-01-18T...',
 *   metadata: { processedKey: '...', contentType: '...' }
 * }
 */
export async function updateFileStatus(fileId, { status, metadata = {} }) {
  // Build update expression dynamically based on what's provided
  const updateParts = [
    '#status = :status', // Always update status
    'updatedAt = :updatedAt', // Always update timestamp
  ];

  const expressionAttributeValues = {
    ':status': status,
    ':updatedAt': new Date().toISOString(),
  };

  // Only add metadata if it has values
  if (Object.keys(metadata).length > 0) {
    updateParts.push('#meta = :meta');
    expressionAttributeValues[':meta'] = metadata;
  }

  return dynamoDB.send(
    new UpdateCommand({
      TableName: process.env.METADATA_TABLE,
      Key: { fileId },
      // UpdateExpression syntax: SET field1 = value1, field2 = value2, ...
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: {
        '#status': 'status', // '#status' because 'status' is a reserved word in DynamoDB
        '#meta': 'metadata',
      },
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );
}

export async function getFileMetadata(fileId) {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: process.env.METADATA_TABLE,
      Key: { fileId },
    }),
  );
  return result.Item;
}
