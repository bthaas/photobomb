import * as tf from '@tensorflow/tfjs';
import { AIService } from './AIService';
import { Face } from '../../types';

export interface FaceDetectionOptions {
  minConfidence?: number;
  maxFaces?: number;
  returnLandmarks?: boolean;
  returnAttributes?: boolean;
}

export interface FaceEmbeddingOptions {
  normalize?: boolean;
  embeddingSize?: number;
}

/**
 * Face Detection Service for detecting and analyzing faces in photos
 * Handles face detection, landmark detection, and face embedding extraction
 */
export class FaceDetectionService {
  private static instance: FaceDetectionService;
  private aiService: AIService;
  private faceDetectionModel: tf.GraphModel | null = null;
  private faceLandmarkModel: tf.GraphModel | null = null;
  private faceEmbeddingModel: tf.GraphModel | null = null;

  private constructor() {
    this.aiService = AIService.getInstance();
  }

  static getInstance(): FaceDetectionService {
    if (!FaceDetectionService.instance) {
      FaceDetectionService.instance = new FaceDetectionService();
    }
    return FaceDetectionService.instance;
  }

  /**
   * Initialize face detection models
   */
  async initialize(): Promise<void> {
    try {
      await this.loadFaceDetectionModel();
      await this.loadFaceLandmarkModel();
      await this.loadFaceEmbeddingModel();
    } catch (error) {
      console.error('Error initializing face detection service:', error);
      throw error;
    }
  }

  /**
   * Detect faces in an image tensor
   */
  async detectFaces(
    imageTensor: tf.Tensor,
    options: FaceDetectionOptions = {}
  ): Promise<Face[]> {
    const {
      minConfidence = 0.5,
      maxFaces = 10,
      returnLandmarks = true,
      returnAttributes = true
    } = options;

    try {
      if (!this.faceDetectionModel) {
        await this.loadFaceDetectionModel();
      }

      // Preprocess image for face detection
      const preprocessed = this.preprocessForFaceDetection(imageTensor);
      
      // Run face detection
      const detections = this.faceDetectionModel!.predict(preprocessed) as tf.Tensor[];
      
      // Parse detection results
      const faces = await this.parseDetectionResults(
        detections,
        imageTensor.shape as [number, number, number],
        minConfidence,
        maxFaces
      );

      // Add landmarks if requested
      if (returnLandmarks && faces.length > 0) {
        await this.addFaceLandmarks(faces, imageTensor);
      }

      // Add attributes if requested
      if (returnAttributes && faces.length > 0) {
        await this.addFaceAttributes(faces, imageTensor);
      }

      // Clean up tensors
      preprocessed.dispose();
      detections.forEach(tensor => tensor.dispose());

      return faces;
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw error;
    }
  }

  /**
   * Extract face embeddings for face recognition
   */
  async extractFaceEmbeddings(
    faces: Face[],
    imageTensor: tf.Tensor,
    options: FaceEmbeddingOptions = {}
  ): Promise<Face[]> {
    const { normalize = true, embeddingSize = 128 } = options;

    try {
      if (!this.faceEmbeddingModel) {
        await this.loadFaceEmbeddingModel();
      }

      const facesWithEmbeddings = [...faces];

      for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        
        // Extract face region
        const faceRegion = this.extractFaceRegion(imageTensor, face.boundingBox);
        
        // Preprocess for embedding extraction
        const preprocessed = this.preprocessForEmbedding(faceRegion);
        
        // Extract embedding
        const embeddingTensor = this.faceEmbeddingModel!.predict(preprocessed) as tf.Tensor;
        let embedding = await embeddingTensor.data();

        // Normalize if requested
        if (normalize) {
          embedding = this.normalizeEmbedding(Array.from(embedding));
        }

        // Ensure embedding is the correct size
        const finalEmbedding = Array.from(embedding).slice(0, embeddingSize);
        
        facesWithEmbeddings[i] = {
          ...face,
          embedding: finalEmbedding
        };

        // Clean up tensors
        faceRegion.dispose();
        preprocessed.dispose();
        embeddingTensor.dispose();
      }

      return facesWithEmbeddings;
    } catch (error) {
      console.error('Error extracting face embeddings:', error);
      throw error;
    }
  }

  /**
   * Compare two face embeddings and return similarity score
   */
  compareFaceEmbeddings(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Face embeddings must have the same length');
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    
    if (magnitude === 0) {
      return 0;
    }

    // Return similarity score between 0 and 1
    return Math.max(0, Math.min(1, (dotProduct / magnitude + 1) / 2));
  }

  /**
   * Find similar faces based on embedding comparison
   */
  findSimilarFaces(
    targetFace: Face,
    candidateFaces: Face[],
    threshold: number = 0.6
  ): Array<{ face: Face; similarity: number }> {
    if (!targetFace.embedding) {
      throw new Error('Target face must have an embedding');
    }

    const similarFaces: Array<{ face: Face; similarity: number }> = [];

    for (const candidate of candidateFaces) {
      if (!candidate.embedding || candidate.id === targetFace.id) {
        continue;
      }

      const similarity = this.compareFaceEmbeddings(
        targetFace.embedding,
        candidate.embedding
      );

      if (similarity >= threshold) {
        similarFaces.push({ face: candidate, similarity });
      }
    }

    // Sort by similarity (highest first)
    return similarFaces.sort((a, b) => b.similarity - a.similarity);
  }

  // Private helper methods

  private async loadFaceDetectionModel(): Promise<void> {
    try {
      await this.aiService.loadModel('face-detection');
      this.faceDetectionModel = this.aiService.getModel('face-detection');
      
      if (!this.faceDetectionModel) {
        throw new Error('Failed to load face detection model');
      }
    } catch (error) {
      console.error('Error loading face detection model:', error);
      throw error;
    }
  }

  private async loadFaceLandmarkModel(): Promise<void> {
    try {
      await this.aiService.loadModel('face-landmarks');
      this.faceLandmarkModel = this.aiService.getModel('face-landmarks');
      
      if (!this.faceLandmarkModel) {
        console.warn('Face landmark model not available');
      }
    } catch (error) {
      console.warn('Error loading face landmark model:', error);
      // Don't throw - landmarks are optional
    }
  }

  private async loadFaceEmbeddingModel(): Promise<void> {
    try {
      await this.aiService.loadModel('face-embedding');
      this.faceEmbeddingModel = this.aiService.getModel('face-embedding');
      
      if (!this.faceEmbeddingModel) {
        throw new Error('Failed to load face embedding model');
      }
    } catch (error) {
      console.error('Error loading face embedding model:', error);
      throw error;
    }
  }

  private preprocessForFaceDetection(imageTensor: tf.Tensor): tf.Tensor {
    // Resize to model input size (typically 320x320 for face detection)
    let processed = tf.image.resizeBilinear(imageTensor as tf.Tensor3D, [320, 320]);
    
    // Normalize to [0, 1]
    processed = tf.div(processed, 255.0);
    
    // Add batch dimension
    processed = tf.expandDims(processed, 0);
    
    return processed;
  }

  private preprocessForEmbedding(faceRegion: tf.Tensor): tf.Tensor {
    // Resize to embedding model input size (typically 112x112)
    let processed = tf.image.resizeBilinear(faceRegion as tf.Tensor3D, [112, 112]);
    
    // Normalize to [-1, 1] for face recognition models
    processed = tf.sub(tf.div(processed, 127.5), 1.0);
    
    // Add batch dimension
    processed = tf.expandDims(processed, 0);
    
    return processed;
  }

  private async parseDetectionResults(
    detections: tf.Tensor[],
    imageShape: [number, number, number],
    minConfidence: number,
    maxFaces: number
  ): Promise<Face[]> {
    const faces: Face[] = [];
    
    try {
      // Assuming detection format: [boxes, scores, classes, num_detections]
      const boxes = await detections[0].data();
      const scores = await detections[1].data();
      const numDetections = Math.min(maxFaces, Math.floor(detections[3].dataSync()[0]));

      const [imageHeight, imageWidth] = imageShape;

      for (let i = 0; i < numDetections; i++) {
        const score = scores[i];
        
        if (score < minConfidence) {
          continue;
        }

        // Extract bounding box (normalized coordinates)
        const yMin = boxes[i * 4];
        const xMin = boxes[i * 4 + 1];
        const yMax = boxes[i * 4 + 2];
        const xMax = boxes[i * 4 + 3];

        // Convert to absolute coordinates
        const x = Math.max(0, xMin * imageWidth);
        const y = Math.max(0, yMin * imageHeight);
        const width = Math.min(imageWidth - x, (xMax - xMin) * imageWidth);
        const height = Math.min(imageHeight - y, (yMax - yMin) * imageHeight);

        const face: Face = {
          id: `face_${Date.now()}_${i}`,
          boundingBox: { x, y, width, height },
          landmarks: {
            leftEye: { x: 0, y: 0 },
            rightEye: { x: 0, y: 0 },
            nose: { x: 0, y: 0 },
            leftMouth: { x: 0, y: 0 },
            rightMouth: { x: 0, y: 0 }
          },
          embedding: [],
          confidence: score,
          attributes: {}
        };

        faces.push(face);
      }
    } catch (error) {
      console.error('Error parsing detection results:', error);
    }

    return faces;
  }

  private async addFaceLandmarks(faces: Face[], imageTensor: tf.Tensor): Promise<void> {
    if (!this.faceLandmarkModel) {
      return;
    }

    try {
      for (const face of faces) {
        // Extract face region
        const faceRegion = this.extractFaceRegion(imageTensor, face.boundingBox);
        
        // Preprocess for landmark detection
        const preprocessed = tf.image.resizeBilinear(faceRegion as tf.Tensor3D, [96, 96]);
        const normalized = tf.div(preprocessed, 255.0);
        const batched = tf.expandDims(normalized, 0);
        
        // Predict landmarks
        const landmarksTensor = this.faceLandmarkModel.predict(batched) as tf.Tensor;
        const landmarksData = await landmarksTensor.data();
        
        // Parse landmarks (assuming 5 key points: left eye, right eye, nose, left mouth, right mouth)
        const landmarks = {
          leftEye: { 
            x: face.boundingBox.x + landmarksData[0] * face.boundingBox.width,
            y: face.boundingBox.y + landmarksData[1] * face.boundingBox.height
          },
          rightEye: { 
            x: face.boundingBox.x + landmarksData[2] * face.boundingBox.width,
            y: face.boundingBox.y + landmarksData[3] * face.boundingBox.height
          },
          nose: { 
            x: face.boundingBox.x + landmarksData[4] * face.boundingBox.width,
            y: face.boundingBox.y + landmarksData[5] * face.boundingBox.height
          },
          leftMouth: { 
            x: face.boundingBox.x + landmarksData[6] * face.boundingBox.width,
            y: face.boundingBox.y + landmarksData[7] * face.boundingBox.height
          },
          rightMouth: { 
            x: face.boundingBox.x + landmarksData[8] * face.boundingBox.width,
            y: face.boundingBox.y + landmarksData[9] * face.boundingBox.height
          }
        };

        face.landmarks = landmarks;

        // Clean up tensors
        faceRegion.dispose();
        preprocessed.dispose();
        normalized.dispose();
        batched.dispose();
        landmarksTensor.dispose();
      }
    } catch (error) {
      console.error('Error adding face landmarks:', error);
    }
  }

  private async addFaceAttributes(faces: Face[], imageTensor: tf.Tensor): Promise<void> {
    // Placeholder for face attribute analysis (age, gender, emotion, etc.)
    // This would use additional models for attribute prediction
    
    for (const face of faces) {
      // Calculate basic attributes from landmarks
      const eyeDistance = Math.sqrt(
        Math.pow(face.landmarks.rightEye.x - face.landmarks.leftEye.x, 2) +
        Math.pow(face.landmarks.rightEye.y - face.landmarks.leftEye.y, 2)
      );
      
      // Estimate smile based on mouth corner positions
      const mouthWidth = Math.abs(face.landmarks.rightMouth.x - face.landmarks.leftMouth.x);
      const smile = Math.min(1, mouthWidth / (eyeDistance * 0.8));
      
      // Estimate eyes open (placeholder - would need actual eye analysis)
      const eyesOpen = 0.9;
      
      face.attributes = {
        smile,
        eyesOpen,
        emotion: smile > 0.6 ? 'happy' : 'neutral'
      };
    }
  }

  private extractFaceRegion(
    imageTensor: tf.Tensor,
    boundingBox: { x: number; y: number; width: number; height: number }
  ): tf.Tensor {
    const { x, y, width, height } = boundingBox;
    
    // Add some padding around the face
    const padding = 0.2;
    const paddedX = Math.max(0, x - width * padding);
    const paddedY = Math.max(0, y - height * padding);
    const paddedWidth = Math.min(
      imageTensor.shape[1] - paddedX,
      width * (1 + 2 * padding)
    );
    const paddedHeight = Math.min(
      imageTensor.shape[0] - paddedY,
      height * (1 + 2 * padding)
    );

    return tf.slice(
      imageTensor,
      [Math.floor(paddedY), Math.floor(paddedX), 0],
      [Math.floor(paddedHeight), Math.floor(paddedWidth), 3]
    );
  }

  private normalizeEmbedding(embedding: number[]): number[] {
    // L2 normalization
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      return embedding;
    }
    
    return embedding.map(val => val / magnitude);
  }
}