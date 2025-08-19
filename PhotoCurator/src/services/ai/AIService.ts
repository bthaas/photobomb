import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { Photo, PhotoAnalysis, FaceDetection, AIModel } from '../../types';
import { useAppStore } from '../../store/appStore';

export class AIService {
  private static instance: AIService;
  private models: Map<string, tf.LayersModel | tf.GraphModel> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Initialize TensorFlow.js and load core models
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize TensorFlow.js platform
      await tf.ready();
      console.log('TensorFlow.js initialized');

      // Set backend (will use the best available: webgl, cpu, etc.)
      console.log('TensorFlow.js backend:', tf.getBackend());

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  /**
   * Load a specific AI model
   */
  async loadModel(modelConfig: AIModel): Promise<void> {
    const { updateModelStatus } = useAppStore.getState();

    try {
      updateModelStatus(modelConfig.name, { isLoaded: false });

      let model: tf.LayersModel | tf.GraphModel;

      // For now, we'll create placeholder models since we don't have actual model URLs
      // In production, these would be real pre-trained models
      switch (modelConfig.type) {
        case 'face_detection':
          model = await this.createPlaceholderFaceDetectionModel();
          break;
        case 'quality_assessment':
          model = await this.createPlaceholderQualityModel();
          break;
        default:
          throw new Error(`Unknown model type: ${modelConfig.type}`);
      }

      this.models.set(modelConfig.name, model);
      updateModelStatus(modelConfig.name, { isLoaded: true });
      
      console.log(`Model ${modelConfig.name} loaded successfully`);
    } catch (error) {
      console.error(`Failed to load model ${modelConfig.name}:`, error);
      updateModelStatus(modelConfig.name, { isLoaded: false });
      throw error;
    }
  }

  /**
   * Analyze a photo using all available AI models
   */
  async analyzePhoto(photo: Photo): Promise<PhotoAnalysis> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Load image as tensor
      const imageTensor = await this.loadImageAsTensor(photo.uri);
      
      // Run all analysis in parallel
      const [
        technicalScores,
        compositionalScores,
        contentScores,
        faces,
        visualEmbedding
      ] = await Promise.all([
        this.analyzeTechnicalQuality(imageTensor),
        this.analyzeComposition(imageTensor),
        this.analyzeContent(imageTensor),
        this.detectFaces(imageTensor),
        this.extractVisualEmbedding(imageTensor)
      ]);

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        ...technicalScores,
        ...compositionalScores,
        ...contentScores
      });

      // Clean up tensor
      imageTensor.dispose();

      const analysis: PhotoAnalysis = {
        // Technical Quality
        sharpnessScore: technicalScores.sharpnessScore,
        exposureScore: technicalScores.exposureScore,
        colorBalanceScore: technicalScores.colorBalanceScore,
        
        // Compositional Quality
        compositionScore: compositionalScores.compositionScore,
        ruleOfThirdsScore: compositionalScores.ruleOfThirdsScore,
        
        // Content Quality
        faceCount: faces.length,
        smileScore: contentScores.smileScore,
        eyesOpenScore: contentScores.eyesOpenScore,
        emotionalScore: contentScores.emotionalScore,
        
        // Overall
        overallScore,
        
        // Detected Features
        faces,
        objects: [], // Will be implemented later
        
        // Clustering
        visualEmbedding,
        
        // Status
        isAnalyzed: true,
        analysisTimestamp: Date.now(),
      };

      return analysis;
    } catch (error) {
      console.error('Failed to analyze photo:', error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple photos
   */
  async analyzePhotos(
    photos: Photo[],
    onProgress?: (progress: number) => void
  ): Promise<Photo[]> {
    const analyzedPhotos: Photo[] = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        const analysis = await this.analyzePhoto(photo);
        analyzedPhotos.push({
          ...photo,
          aiAnalysis: analysis,
        });
      } catch (error) {
        console.error(`Failed to analyze photo ${photo.id}:`, error);
        // Add photo without analysis
        analyzedPhotos.push(photo);
      }
      
      // Report progress
      if (onProgress) {
        onProgress((i + 1) / photos.length);
      }
    }
    
    return analyzedPhotos;
  }

  /**
   * Detect and remove duplicates based on visual similarity
   */
  async detectDuplicates(photos: Photo[]): Promise<Photo[][]> {
    // Extract visual embeddings for all photos
    const embeddings: { photo: Photo; embedding: number[] }[] = [];
    
    for (const photo of photos) {
      if (photo.aiAnalysis?.visualEmbedding) {
        embeddings.push({
          photo,
          embedding: photo.aiAnalysis.visualEmbedding,
        });
      }
    }
    
    // Find similar photos using cosine similarity
    const duplicateGroups: Photo[][] = [];
    const processed = new Set<string>();
    
    for (const item of embeddings) {
      if (processed.has(item.photo.id)) continue;
      
      const similarPhotos = [item.photo];
      processed.add(item.photo.id);
      
      for (const other of embeddings) {
        if (processed.has(other.photo.id)) continue;
        
        const similarity = this.cosineSimilarity(item.embedding, other.embedding);
        
        // If similarity is above threshold (0.9), consider as duplicate
        if (similarity > 0.9) {
          similarPhotos.push(other.photo);
          processed.add(other.photo.id);
        }
      }
      
      if (similarPhotos.length > 1) {
        duplicateGroups.push(similarPhotos);
      }
    }
    
    return duplicateGroups;
  }

  // Private helper methods

  private async loadImageAsTensor(uri: string): Promise<tf.Tensor3D> {
    // In a real implementation, this would load the image from URI
    // For now, return a placeholder tensor
    return tf.randomNormal([224, 224, 3]) as tf.Tensor3D;
  }

  private async analyzeTechnicalQuality(imageTensor: tf.Tensor3D): Promise<{
    sharpnessScore: number;
    exposureScore: number;
    colorBalanceScore: number;
  }> {
    // Placeholder implementation
    // Real implementation would use computer vision algorithms
    return {
      sharpnessScore: Math.random() * 0.3 + 0.7, // 0.7-1.0
      exposureScore: Math.random() * 0.4 + 0.6,  // 0.6-1.0
      colorBalanceScore: Math.random() * 0.5 + 0.5, // 0.5-1.0
    };
  }

  private async analyzeComposition(imageTensor: tf.Tensor3D): Promise<{
    compositionScore: number;
    ruleOfThirdsScore: number;
  }> {
    // Placeholder implementation
    return {
      compositionScore: Math.random() * 0.4 + 0.6,
      ruleOfThirdsScore: Math.random() * 0.6 + 0.4,
    };
  }

  private async analyzeContent(imageTensor: tf.Tensor3D): Promise<{
    smileScore: number;
    eyesOpenScore: number;
    emotionalScore: number;
  }> {
    // Placeholder implementation
    return {
      smileScore: Math.random(),
      eyesOpenScore: Math.random() * 0.3 + 0.7,
      emotionalScore: Math.random() * 0.4 + 0.6,
    };
  }

  private async detectFaces(imageTensor: tf.Tensor3D): Promise<FaceDetection[]> {
    // Placeholder implementation
    const faceCount = Math.floor(Math.random() * 4); // 0-3 faces
    const faces: FaceDetection[] = [];
    
    for (let i = 0; i < faceCount; i++) {
      faces.push({
        id: `face_${i}`,
        boundingBox: {
          x: Math.random() * 200,
          y: Math.random() * 200,
          width: 50 + Math.random() * 100,
          height: 50 + Math.random() * 100,
        },
        confidence: Math.random() * 0.3 + 0.7,
      });
    }
    
    return faces;
  }

  private async extractVisualEmbedding(imageTensor: tf.Tensor3D): Promise<number[]> {
    // Placeholder implementation - would use a feature extraction model
    return Array.from({ length: 128 }, () => Math.random() * 2 - 1);
  }

  private calculateOverallScore(scores: {
    sharpnessScore: number;
    exposureScore: number;
    colorBalanceScore: number;
    compositionScore: number;
    ruleOfThirdsScore: number;
    smileScore: number;
    eyesOpenScore: number;
    emotionalScore: number;
  }): number {
    const weights = {
      technical: 0.3,
      compositional: 0.3,
      content: 0.4,
    };
    
    const technicalScore = (
      scores.sharpnessScore * 0.4 +
      scores.exposureScore * 0.3 +
      scores.colorBalanceScore * 0.3
    );
    
    const compositionalScore = (
      scores.compositionScore * 0.6 +
      scores.ruleOfThirdsScore * 0.4
    );
    
    const contentScore = (
      scores.smileScore * 0.3 +
      scores.eyesOpenScore * 0.3 +
      scores.emotionalScore * 0.4
    );
    
    return (
      technicalScore * weights.technical +
      compositionalScore * weights.compositional +
      contentScore * weights.content
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Placeholder model creation methods
  private async createPlaceholderFaceDetectionModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 32,
          kernelSize: 3,
          activation: 'relu',
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 4 }), // x, y, width, height
      ],
    });
    
    return model;
  }

  private async createPlaceholderQualityModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: [224, 224, 3],
          filters: 16,
          kernelSize: 3,
          activation: 'relu',
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }), // Quality score 0-1
      ],
    });
    
    return model;
  }
}

export const aiService = AIService.getInstance();