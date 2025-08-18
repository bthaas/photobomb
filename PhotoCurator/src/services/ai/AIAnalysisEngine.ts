import * as tf from '@tensorflow/tfjs';
import { AIService } from './AIService';
import { FaceDetectionService } from './FaceDetectionService';
import { 
  Photo, 
  ImageFeatures, 
  QualityScore, 
  CompositionScore, 
  ContentScore, 
  Face, 
  Color, 
  DetectedObject, 
  DetectedScene 
} from '../../types';

export interface AnalysisOptions {
  includeFeatures?: boolean;
  includeQuality?: boolean;
  includeComposition?: boolean;
  includeContent?: boolean;
  includeFaces?: boolean;
}

export interface PreprocessingOptions {
  targetSize?: [number, number];
  normalize?: boolean;
  centerCrop?: boolean;
  maintainAspectRatio?: boolean;
}

export interface AnalysisProgress {
  stage: string;
  progress: number;
  total: number;
}

/**
 * AI Analysis Engine for comprehensive photo analysis
 * Handles feature extraction, quality analysis, composition analysis, and content analysis
 */
export class AIAnalysisEngine {
  private static instance: AIAnalysisEngine;
  private aiService: AIService;
  private faceDetectionService: FaceDetectionService;

  private constructor() {
    this.aiService = AIService.getInstance();
    this.faceDetectionService = FaceDetectionService.getInstance();
  }

  static getInstance(): AIAnalysisEngine {
    if (!AIAnalysisEngine.instance) {
      AIAnalysisEngine.instance = new AIAnalysisEngine();
    }
    return AIAnalysisEngine.instance;
  }

  /**
   * Perform comprehensive analysis on a photo
   */
  async analyzePhoto(
    photo: Photo, 
    options: AnalysisOptions = {},
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<{
    features?: ImageFeatures;
    qualityScore?: QualityScore;
    compositionScore?: CompositionScore;
    contentScore?: ContentScore;
    faces?: Face[];
  }> {
    const {
      includeFeatures = true,
      includeQuality = true,
      includeComposition = true,
      includeContent = true,
      includeFaces = true
    } = options;

    const results: any = {};
    let currentStep = 0;
    const totalSteps = [includeFeatures, includeQuality, includeComposition, includeContent, includeFaces]
      .filter(Boolean).length;

    let imageTensor: tf.Tensor | null = null;
    
    try {
      // Load image tensor
      imageTensor = await this.loadImageTensor(photo.uri);

      if (includeFeatures) {
        onProgress?.({ stage: 'Extracting features', progress: currentStep++, total: totalSteps });
        results.features = await this.extractFeatures(imageTensor);
      }

      if (includeQuality) {
        onProgress?.({ stage: 'Analyzing quality', progress: currentStep++, total: totalSteps });
        results.qualityScore = await this.analyzeQuality(imageTensor);
      }

      if (includeComposition) {
        onProgress?.({ stage: 'Analyzing composition', progress: currentStep++, total: totalSteps });
        results.compositionScore = await this.analyzeComposition(imageTensor);
      }

      if (includeContent) {
        onProgress?.({ stage: 'Analyzing content', progress: currentStep++, total: totalSteps });
        results.contentScore = await this.analyzeContent(imageTensor);
      }

      if (includeFaces) {
        onProgress?.({ stage: 'Detecting faces', progress: currentStep++, total: totalSteps });
        results.faces = await this.detectFaces(imageTensor);
      }

      return results;
    } catch (error) {
      console.error('Error analyzing photo:', error);
      throw error;
    } finally {
      // Clean up tensor in finally block to ensure cleanup even on error
      if (imageTensor) {
        try {
          imageTensor.dispose();
        } catch (disposeError) {
          console.warn('Error disposing image tensor:', disposeError);
        }
      }
    }
  }

  /**
   * Extract comprehensive image features
   */
  async extractFeatures(imageTensor: tf.Tensor): Promise<ImageFeatures> {
    try {
      await this.aiService.loadModel('feature-extraction');
      
      const model = this.aiService.getModel('feature-extraction');
      if (!model) {
        throw new Error('Feature extraction model not loaded');
      }

      // Preprocess image for feature extraction
      const preprocessed = this.preprocessForFeatureExtraction(imageTensor);
      
      // Extract features using the model
      const features = model.predict(preprocessed) as tf.Tensor;
      const embedding = await features.data();
      
      // Extract dominant colors
      const dominantColors = await this.extractDominantColors(imageTensor);
      
      // Detect objects and scenes
      const objects = await this.detectObjects(imageTensor);
      const scenes = await this.detectScenes(imageTensor);

      // Clean up tensors
      preprocessed.dispose();
      features.dispose();

      return {
        embedding: Array.from(embedding),
        dominantColors,
        objects,
        scenes
      };
    } catch (error) {
      console.error('Error extracting features:', error);
      throw error;
    }
  }

  /**
   * Analyze photo quality metrics
   */
  async analyzeQuality(imageTensor: tf.Tensor): Promise<QualityScore> {
    const sharpness = await this.calculateSharpness(imageTensor);
    const exposure = await this.calculateExposure(imageTensor);
    const colorBalance = await this.calculateColorBalance(imageTensor);
    const noise = await this.calculateNoise(imageTensor);

    // Calculate overall quality score
    const overall = (sharpness * 0.3 + exposure * 0.25 + colorBalance * 0.25 + (1 - noise) * 0.2);

    return {
      overall: Math.max(0, Math.min(1, overall)),
      sharpness,
      exposure,
      colorBalance,
      noise
    };
  }

  /**
   * Analyze photo composition
   */
  async analyzeComposition(imageTensor: tf.Tensor): Promise<CompositionScore> {
    const ruleOfThirds = await this.calculateRuleOfThirds(imageTensor);
    const leadingLines = await this.detectLeadingLines(imageTensor);
    const symmetry = await this.calculateSymmetry(imageTensor);
    const subjectPlacement = await this.analyzeSubjectPlacement(imageTensor);

    // Calculate overall composition score
    const overall = (ruleOfThirds * 0.3 + leadingLines * 0.2 + symmetry * 0.2 + subjectPlacement * 0.3);

    return {
      overall: Math.max(0, Math.min(1, overall)),
      ruleOfThirds,
      leadingLines,
      symmetry,
      subjectPlacement
    };
  }

  /**
   * Analyze photo content
   */
  async analyzeContent(imageTensor: tf.Tensor): Promise<ContentScore> {
    const faceQuality = await this.analyzeFaceQuality(imageTensor);
    const emotionalSentiment = await this.analyzeEmotionalSentiment(imageTensor);
    const interestingness = await this.calculateInterestingness(imageTensor);

    // Calculate overall content score
    const overall = (faceQuality * 0.4 + emotionalSentiment * 0.3 + interestingness * 0.3);

    return {
      overall: Math.max(0, Math.min(1, overall)),
      faceQuality,
      emotionalSentiment,
      interestingness
    };
  }

  /**
   * Detect faces in the image
   */
  async detectFaces(imageTensor: tf.Tensor): Promise<Face[]> {
    try {
      // Use the dedicated face detection service
      const faces = await this.faceDetectionService.detectFaces(imageTensor, {
        minConfidence: 0.5,
        maxFaces: 10,
        returnLandmarks: true,
        returnAttributes: true
      });

      // Extract embeddings for the detected faces
      const facesWithEmbeddings = await this.faceDetectionService.extractFaceEmbeddings(
        faces,
        imageTensor
      );

      return facesWithEmbeddings;
    } catch (error) {
      console.error('Error detecting faces:', error);
      throw error;
    }
  }

  /**
   * Preprocess image for ML model input
   */
  preprocessImage(
    imageTensor: tf.Tensor, 
    options: PreprocessingOptions = {}
  ): tf.Tensor {
    const {
      targetSize = [224, 224],
      normalize = true,
      centerCrop = false,
      maintainAspectRatio = true
    } = options;

    let processed = imageTensor;

    // Resize image
    if (centerCrop) {
      processed = this.centerCropAndResize(processed, targetSize);
    } else if (maintainAspectRatio) {
      processed = this.resizeWithAspectRatio(processed, targetSize);
    } else {
      processed = tf.image.resizeBilinear(processed, targetSize);
    }

    // Normalize pixel values
    if (normalize) {
      processed = tf.div(processed, 255.0);
    }

    // Add batch dimension if needed
    if (processed.shape.length === 3) {
      processed = tf.expandDims(processed, 0);
    }

    return processed;
  }

  // Private helper methods

  private async loadImageTensor(uri: string): Promise<tf.Tensor> {
    // This would be implemented based on the platform
    // For now, return a placeholder tensor
    return tf.zeros([224, 224, 3]);
  }

  private preprocessForFeatureExtraction(imageTensor: tf.Tensor): tf.Tensor {
    return this.preprocessImage(imageTensor, {
      targetSize: [224, 224],
      normalize: true,
      centerCrop: true
    });
  }

  private preprocessForFaceDetection(imageTensor: tf.Tensor): tf.Tensor {
    return this.preprocessImage(imageTensor, {
      targetSize: [320, 320],
      normalize: true,
      maintainAspectRatio: true
    });
  }

  private async extractDominantColors(imageTensor: tf.Tensor): Promise<Color[]> {
    try {
      // Implement color extraction using k-means clustering
      const resized = tf.image.resizeBilinear(imageTensor, [50, 50]);
      const flattened = tf.reshape(resized, [-1, 3]);
      const colors = await flattened.data();
      
      // Simple dominant color extraction (would be more sophisticated in practice)
      const dominantColors: Color[] = [];
      const numColors = 5;
      const totalPixels = colors.length / 3;
      const step = Math.max(1, Math.floor(totalPixels / numColors));
      
      for (let i = 0; i < numColors; i++) {
        const pixelIndex = Math.min(i * step, totalPixels - 1);
        const colorIndex = pixelIndex * 3;
        
        const r = Math.round(Math.min(255, Math.max(0, colors[colorIndex] * 255)));
        const g = Math.round(Math.min(255, Math.max(0, colors[colorIndex + 1] * 255)));
        const b = Math.round(Math.min(255, Math.max(0, colors[colorIndex + 2] * 255)));
        
        dominantColors.push({
          r,
          g,
          b,
          hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
          percentage: 20 // Placeholder - would be calculated from actual clustering
        });
      }

      resized.dispose();
      flattened.dispose();
      
      return dominantColors;
    } catch (error) {
      console.error('Error extracting dominant colors:', error);
      // Return 5 default colors if extraction fails
      const defaultColors: Color[] = [];
      for (let i = 0; i < 5; i++) {
        const gray = 128 + (i * 20); // Vary the gray levels
        defaultColors.push({
          r: Math.min(255, gray),
          g: Math.min(255, gray),
          b: Math.min(255, gray),
          hex: `#${Math.min(255, gray).toString(16).padStart(2, '0').repeat(3)}`,
          percentage: 20
        });
      }
      return defaultColors;
    }
  }

  private async detectObjects(imageTensor: tf.Tensor): Promise<DetectedObject[]> {
    // Placeholder implementation
    return [
      {
        label: 'person',
        confidence: 0.85,
        boundingBox: { x: 0.2, y: 0.1, width: 0.3, height: 0.6 }
      }
    ];
  }

  private async detectScenes(imageTensor: tf.Tensor): Promise<DetectedScene[]> {
    // Placeholder implementation
    return [
      { label: 'outdoor', confidence: 0.75 },
      { label: 'nature', confidence: 0.65 }
    ];
  }

  private async calculateSharpness(imageTensor: tf.Tensor): Promise<number> {
    // Calculate Laplacian variance for sharpness
    const gray = tf.mean(imageTensor, -1, true);
    const laplacian = tf.conv2d(
      tf.expandDims(gray, 0),
      tf.tensor4d([[[[-1]], [[0]], [[1]]], [[[0]], [[0]], [[0]]], [[[1]], [[0]], [[-1]]]]),
      1,
      'same'
    );
    
    const variance = tf.moments(laplacian).variance;
    const sharpness = await variance.data();
    
    gray.dispose();
    laplacian.dispose();
    variance.dispose();
    
    return Math.min(1, sharpness[0] / 1000); // Normalize
  }

  private async calculateExposure(imageTensor: tf.Tensor): Promise<number> {
    // Calculate exposure based on brightness distribution
    const brightness = tf.mean(imageTensor, -1);
    const mean = tf.mean(brightness);
    const meanValue = await mean.data();
    
    // Optimal exposure is around 0.5 (middle gray)
    const exposure = 1 - Math.abs(meanValue[0] - 0.5) * 2;
    
    brightness.dispose();
    mean.dispose();
    
    return Math.max(0, Math.min(1, exposure));
  }

  private async calculateColorBalance(imageTensor: tf.Tensor): Promise<number> {
    // Calculate color balance based on channel means
    const [r, g, b] = tf.split(imageTensor, 3, -1);
    const rMean = await tf.mean(r).data();
    const gMean = await tf.mean(g).data();
    const bMean = await tf.mean(b).data();
    
    // Calculate deviation from neutral gray
    const deviation = Math.abs(rMean[0] - gMean[0]) + 
                     Math.abs(gMean[0] - bMean[0]) + 
                     Math.abs(bMean[0] - rMean[0]);
    
    const colorBalance = 1 - Math.min(1, deviation * 3);
    
    r.dispose();
    g.dispose();
    b.dispose();
    
    return Math.max(0, colorBalance);
  }

  private async calculateNoise(imageTensor: tf.Tensor): Promise<number> {
    // Estimate noise using high-frequency content
    const gray = tf.mean(imageTensor, -1, true);
    const blurred = tf.avgPool(gray, 3, 1, 'same');
    const highFreq = tf.sub(gray, blurred);
    const noise = tf.mean(tf.abs(highFreq));
    const noiseValue = await noise.data();
    
    gray.dispose();
    blurred.dispose();
    highFreq.dispose();
    noise.dispose();
    
    return Math.min(1, noiseValue[0] * 10); // Normalize
  }

  private async calculateRuleOfThirds(imageTensor: tf.Tensor): Promise<number> {
    // Analyze subject placement according to rule of thirds
    const [height, width] = imageTensor.shape.slice(0, 2);
    const thirdH = Math.floor(height / 3);
    const thirdW = Math.floor(width / 3);
    
    // Extract regions around intersection points
    const intersections = [
      [thirdH, thirdW], [thirdH, 2 * thirdW],
      [2 * thirdH, thirdW], [2 * thirdH, 2 * thirdW]
    ];
    
    // Calculate interest at intersection points (simplified)
    let totalInterest = 0;
    for (const [y, x] of intersections) {
      const region = tf.slice(imageTensor, [y - 10, x - 10, 0], [20, 20, 3]);
      const variance = tf.moments(region).variance;
      const interest = await variance.data();
      totalInterest += interest[0];
      region.dispose();
      variance.dispose();
    }
    
    return Math.min(1, totalInterest / 4000); // Normalize
  }

  private async detectLeadingLines(imageTensor: tf.Tensor): Promise<number> {
    // Simplified edge detection for leading lines
    const gray = tf.mean(imageTensor, -1, true);
    const sobelX = tf.conv2d(
      tf.expandDims(gray, 0),
      tf.tensor4d([[[[-1]], [[0]], [[1]]], [[[0]], [[0]], [[0]]], [[[1]], [[0]], [[-1]]]]),
      1,
      'same'
    );
    
    const edges = tf.mean(tf.abs(sobelX));
    const edgeStrength = await edges.data();
    
    gray.dispose();
    sobelX.dispose();
    edges.dispose();
    
    return Math.min(1, edgeStrength[0] * 5); // Normalize
  }

  private async calculateSymmetry(imageTensor: tf.Tensor): Promise<number> {
    // Calculate horizontal symmetry
    const flipped = tf.reverse(imageTensor, [1]);
    const diff = tf.mean(tf.abs(tf.sub(imageTensor, flipped)));
    const symmetry = await diff.data();
    
    flipped.dispose();
    diff.dispose();
    
    return Math.max(0, 1 - symmetry[0] * 2); // Normalize
  }

  private async analyzeSubjectPlacement(imageTensor: tf.Tensor): Promise<number> {
    // Analyze if main subject is well-placed
    const center = tf.slice(imageTensor, 
      [Math.floor(imageTensor.shape[0] * 0.25), Math.floor(imageTensor.shape[1] * 0.25), 0],
      [Math.floor(imageTensor.shape[0] * 0.5), Math.floor(imageTensor.shape[1] * 0.5), 3]
    );
    
    const centerVariance = tf.moments(center).variance;
    const placement = await centerVariance.data();
    
    center.dispose();
    centerVariance.dispose();
    
    return Math.min(1, placement[0] / 1000); // Normalize
  }

  private async analyzeFaceQuality(imageTensor: tf.Tensor): Promise<number> {
    // Placeholder - would analyze face quality if faces are present
    return 0.7;
  }

  private async analyzeEmotionalSentiment(imageTensor: tf.Tensor): Promise<number> {
    // Placeholder - would analyze emotional content
    return 0.6;
  }

  private async calculateInterestingness(imageTensor: tf.Tensor): Promise<number> {
    // Calculate overall visual interest
    const variance = tf.moments(imageTensor).variance;
    const interest = await variance.data();
    
    variance.dispose();
    
    return Math.min(1, interest[0] / 10000); // Normalize
  }

  // Removed parseFaceDetections - now handled by FaceDetectionService

  private centerCropAndResize(tensor: tf.Tensor, targetSize: [number, number]): tf.Tensor {
    if (!tensor.shape || tensor.shape.length < 2) {
      // Fallback to direct resize if shape is not available
      return tf.image.resizeBilinear(tensor, targetSize);
    }
    
    const [height, width] = tensor.shape.slice(0, 2);
    const minDim = Math.min(height, width);
    const startY = Math.floor((height - minDim) / 2);
    const startX = Math.floor((width - minDim) / 2);
    
    const cropped = tf.slice(tensor, [startY, startX, 0], [minDim, minDim, 3]);
    const resized = tf.image.resizeBilinear(cropped, targetSize);
    
    cropped.dispose();
    return resized;
  }

  private resizeWithAspectRatio(tensor: tf.Tensor, targetSize: [number, number]): tf.Tensor {
    if (!tensor.shape || tensor.shape.length < 2) {
      // Fallback to direct resize if shape is not available
      return tf.image.resizeBilinear(tensor, targetSize);
    }
    
    const [height, width] = tensor.shape.slice(0, 2);
    const aspectRatio = width / height;
    const targetAspectRatio = targetSize[1] / targetSize[0];
    
    let newHeight, newWidth;
    if (aspectRatio > targetAspectRatio) {
      newWidth = targetSize[1];
      newHeight = Math.round(targetSize[1] / aspectRatio);
    } else {
      newHeight = targetSize[0];
      newWidth = Math.round(targetSize[0] * aspectRatio);
    }
    
    const resized = tf.image.resizeBilinear(tensor, [newHeight, newWidth]);
    
    // Pad to target size
    const padTop = Math.floor((targetSize[0] - newHeight) / 2);
    const padBottom = targetSize[0] - newHeight - padTop;
    const padLeft = Math.floor((targetSize[1] - newWidth) / 2);
    const padRight = targetSize[1] - newWidth - padLeft;
    
    const padded = tf.pad(resized, [[padTop, padBottom], [padLeft, padRight], [0, 0]]);
    
    resized.dispose();
    return padded;
  }
}