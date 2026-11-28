import {
  RekognitionClient,
  CreateCollectionCommand,
  DescribeCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DeleteFacesCommand,
} from '@aws-sdk/client-rekognition';
import dotenv from 'dotenv';

dotenv.config();

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION_ID || 'sptech_employee_faces';

// Client uses environment credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// or automatically assumes the IAM Role when deployed on AWS Lambda / EC2!
let client = null;

export function getRekognitionClient() {
  if (!client) {
    const config = { region: REGION };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    client = new RekognitionClient(config);
  }
  return client;
}

export function isRekognitionConfigured() {
  return Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
    process.env.AWS_EXECUTION_ENV // AWS Lambda environment
  );
}

/**
 * Converts a base64 Data URL or raw base64 string to a Buffer
 */
export function imageToBuffer(imageStr) {
  if (!imageStr) throw new Error('Image data is required');
  const base64Data = imageStr.includes(',') ? imageStr.split(',')[1] : imageStr;
  return Buffer.from(base64Data, 'base64');
}

/**
 * Ensures the AWS Rekognition collection exists.
 * Creates it automatically if it does not exist.
 */
export async function ensureCollectionExists() {
  const rekognition = getRekognitionClient();
  try {
    await rekognition.send(new DescribeCollectionCommand({ CollectionId: COLLECTION_ID }));
    return { exists: true, collectionId: COLLECTION_ID };
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      try {
        const createRes = await rekognition.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID }));
        console.log(`✓ AWS Rekognition collection created: ${COLLECTION_ID} (ARN: ${createRes.CollectionArn})`);
        return { exists: true, created: true, collectionId: COLLECTION_ID };
      } catch (createErr) {
        console.error('Error creating AWS Rekognition collection:', createErr.message);
        throw createErr;
      }
    }
    throw err;
  }
}

/**
 * Indexes an employee's face into the AWS Rekognition Face Collection.
 * Associates the face with the employee ID using ExternalImageId.
 */
export async function indexEmployeeFace(employeeId, imageBase64, oldFaceId = null) {
  const rekognition = getRekognitionClient();
  await ensureCollectionExists();

  // If replacing an existing face, delete the old FaceId first
  if (oldFaceId) {
    try {
      await deleteEmployeeFace(oldFaceId);
    } catch (e) {
      console.warn(`Could not delete old face ID ${oldFaceId}:`, e.message);
    }
  }

  const imageBytes = imageToBuffer(imageBase64);
  const command = new IndexFacesCommand({
    CollectionId: COLLECTION_ID,
    Image: { Bytes: imageBytes },
    ExternalImageId: String(employeeId),
    DetectionAttributes: ['ALL'],
    MaxFaces: 1,
    QualityFilter: 'AUTO',
  });

  const response = await rekognition.send(command);

  if (!response.FaceRecords || response.FaceRecords.length === 0) {
    throw new Error('No clear face detected by AWS Rekognition. Ensure front-facing position and good lighting.');
  }

  const faceRecord = response.FaceRecords[0];
  return {
    success: true,
    faceId: faceRecord.Face.FaceId,
    confidence: faceRecord.Face.Confidence,
    boundingBox: faceRecord.Face.BoundingBox,
    collectionId: COLLECTION_ID,
  };
}

/**
 * Searches the AWS Rekognition Face Collection using a live camera frame.
 * Returns the matching employee ID and similarity score.
 */
export async function searchEmployeeFace(imageBase64, similarityThreshold = 80) {
  const rekognition = getRekognitionClient();
  await ensureCollectionExists();

  const imageBytes = imageToBuffer(imageBase64);
  const command = new SearchFacesByImageCommand({
    CollectionId: COLLECTION_ID,
    Image: { Bytes: imageBytes },
    FaceMatchThreshold: similarityThreshold,
    MaxFaces: 1,
    QualityFilter: 'AUTO',
  });

  const response = await rekognition.send(command);

  if (!response.FaceMatches || response.FaceMatches.length === 0) {
    return {
      matched: false,
      message: 'No registered face match found in AWS Rekognition collection.',
      highestSimilarity: 0,
    };
  }

  const bestMatch = response.FaceMatches[0];
  const matchedEmployeeId = parseInt(bestMatch.Face.ExternalImageId, 10);

  return {
    matched: true,
    employeeId: matchedEmployeeId,
    similarity: Math.round(bestMatch.Similarity * 100) / 100,
    faceId: bestMatch.Face.FaceId,
    confidence: bestMatch.Face.Confidence,
  };
}

/**
 * Deletes a face from the AWS Rekognition collection.
 */
export async function deleteEmployeeFace(faceId) {
  if (!faceId) return;
  const rekognition = getRekognitionClient();
  const command = new DeleteFacesCommand({
    CollectionId: COLLECTION_ID,
    FaceIds: [faceId],
  });
  return rekognition.send(command);
}
