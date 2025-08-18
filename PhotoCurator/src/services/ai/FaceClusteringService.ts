import { Face, PersonCluster, Photo } from '../../types';
import { FaceDetectionService } from './FaceDetectionService';

export interface ClusteringOptions {
  similarityThreshold?: number;
  minClusterSize?: number;
  maxClusters?: number;
  linkageMethod?: 'single' | 'complete' | 'average';
}

export interface ClusteringResult {
  clusters: PersonCluster[];
  unclusteredFaces: Face[];
  processingTime: number;
  parameters: ClusteringOptions;
}

/**
 * Face Clustering Service for grouping similar faces together
 * Uses hierarchical clustering based on face embeddings
 */
export class FaceClusteringService {
  private static instance: FaceClusteringService;
  private faceDetectionService: FaceDetectionService;

  private constructor() {
    this.faceDetectionService = FaceDetectionService.getInstance();
  }

  static getInstance(): FaceClusteringService {
    if (!FaceClusteringService.instance) {
      FaceClusteringService.instance = new FaceClusteringService();
    }
    return FaceClusteringService.instance;
  }

  /**
   * Cluster faces based on similarity
   */
  async clusterFaces(
    faces: Face[],
    options: ClusteringOptions = {}
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    
    const {
      similarityThreshold = 0.6,
      minClusterSize = 2,
      maxClusters = 50,
      linkageMethod = 'average'
    } = options;

    try {
      // Filter faces with embeddings
      const facesWithEmbeddings = faces.filter(face => 
        face.embedding && face.embedding.length > 0
      );

      if (facesWithEmbeddings.length < minClusterSize) {
        return {
          clusters: [],
          unclusteredFaces: faces,
          processingTime: Date.now() - startTime,
          parameters: options
        };
      }

      // Calculate similarity matrix
      const similarityMatrix = this.calculateSimilarityMatrix(facesWithEmbeddings);

      // Perform hierarchical clustering
      const clusters = this.hierarchicalClustering(
        facesWithEmbeddings,
        similarityMatrix,
        similarityThreshold,
        linkageMethod
      );

      // Filter clusters by minimum size
      const validClusters = clusters.filter(cluster => 
        cluster.faces.length >= minClusterSize
      );

      // Limit number of clusters
      const finalClusters = validClusters.slice(0, maxClusters);

      // Collect unclustered faces
      const clusteredFaceIds = new Set(
        finalClusters.flatMap(cluster => cluster.faces.map(face => face.id))
      );
      const unclusteredFaces = faces.filter(face => !clusteredFaceIds.has(face.id));

      // Convert to PersonCluster format
      const personClusters = finalClusters.map((cluster, index) => ({
        id: `person_cluster_${Date.now()}_${index}`,
        faces: cluster.faces,
        photos: [], // Will be populated when linking to photos
        confidence: cluster.confidence,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      return {
        clusters: personClusters,
        unclusteredFaces,
        processingTime: Date.now() - startTime,
        parameters: options
      };
    } catch (error) {
      console.error('Error clustering faces:', error);
      throw error;
    }
  }

  /**
   * Merge two person clusters
   */
  mergeClusters(cluster1: PersonCluster, cluster2: PersonCluster): PersonCluster {
    const mergedFaces = [...cluster1.faces, ...cluster2.faces];
    const mergedPhotos = [...new Set([...cluster1.photos, ...cluster2.photos])];
    
    // Calculate new confidence as average
    const newConfidence = (cluster1.confidence + cluster2.confidence) / 2;

    return {
      id: `merged_${cluster1.id}_${cluster2.id}`,
      name: cluster1.name || cluster2.name,
      faces: mergedFaces,
      photos: mergedPhotos,
      confidence: newConfidence,
      createdAt: new Date(Math.min(cluster1.createdAt.getTime(), cluster2.createdAt.getTime())),
      updatedAt: new Date()
    };
  }

  /**
   * Split a person cluster into multiple clusters
   */
  async splitCluster(
    cluster: PersonCluster,
    options: ClusteringOptions = {}
  ): Promise<PersonCluster[]> {
    if (cluster.faces.length < 4) {
      // Can't meaningfully split clusters with fewer than 4 faces
      return [cluster];
    }

    // Re-cluster the faces with stricter similarity threshold
    const stricterOptions = {
      ...options,
      similarityThreshold: (options.similarityThreshold || 0.6) + 0.1,
      minClusterSize: 2
    };

    const result = await this.clusterFaces(cluster.faces, stricterOptions);
    
    // Convert back to PersonClusters
    return result.clusters.map(newCluster => ({
      ...newCluster,
      id: `split_${cluster.id}_${newCluster.id}`,
      name: cluster.name,
      photos: cluster.photos.filter(photo => 
        photo.faces?.some(face => 
          newCluster.faces.some(clusterFace => clusterFace.id === face.id)
        )
      )
    }));
  }

  /**
   * Add a new face to existing clusters or create a new cluster
   */
  async addFaceToCluster(
    face: Face,
    existingClusters: PersonCluster[],
    similarityThreshold: number = 0.6
  ): Promise<{ cluster: PersonCluster | null; isNewCluster: boolean }> {
    if (!face.embedding || face.embedding.length === 0) {
      return { cluster: null, isNewCluster: false };
    }

    let bestMatch: { cluster: PersonCluster; similarity: number } | null = null;

    // Find the best matching cluster
    for (const cluster of existingClusters) {
      const clusterSimilarity = this.calculateClusterSimilarity(face, cluster);
      
      if (clusterSimilarity >= similarityThreshold) {
        if (!bestMatch || clusterSimilarity > bestMatch.similarity) {
          bestMatch = { cluster, similarity: clusterSimilarity };
        }
      }
    }

    if (bestMatch) {
      // Add face to existing cluster
      const updatedCluster: PersonCluster = {
        ...bestMatch.cluster,
        faces: [...bestMatch.cluster.faces, face],
        confidence: (bestMatch.cluster.confidence + bestMatch.similarity) / 2,
        updatedAt: new Date()
      };
      
      return { cluster: updatedCluster, isNewCluster: false };
    } else {
      // Create new cluster
      const newCluster: PersonCluster = {
        id: `person_cluster_${Date.now()}`,
        faces: [face],
        photos: [],
        confidence: face.confidence,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return { cluster: newCluster, isNewCluster: true };
    }
  }

  /**
   * Link person clusters to photos containing those faces
   */
  linkClustersToPhotos(clusters: PersonCluster[], photos: Photo[]): PersonCluster[] {
    return clusters.map(cluster => {
      const clusterPhotos = photos.filter(photo => 
        photo.faces?.some(photoFace => 
          cluster.faces.some(clusterFace => clusterFace.id === photoFace.id)
        )
      );

      return {
        ...cluster,
        photos: clusterPhotos,
        updatedAt: new Date()
      };
    });
  }

  // Private helper methods

  private calculateSimilarityMatrix(faces: Face[]): number[][] {
    const matrix: number[][] = [];
    
    for (let i = 0; i < faces.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < faces.length; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else if (j < i) {
          matrix[i][j] = matrix[j][i]; // Use symmetry
        } else {
          matrix[i][j] = this.faceDetectionService.compareFaceEmbeddings(
            faces[i].embedding!,
            faces[j].embedding!
          );
        }
      }
    }
    
    return matrix;
  }

  private hierarchicalClustering(
    faces: Face[],
    similarityMatrix: number[][],
    threshold: number,
    linkageMethod: 'single' | 'complete' | 'average'
  ): Array<{ faces: Face[]; confidence: number }> {
    // Initialize each face as its own cluster
    let clusters = faces.map((face, index) => ({
      faces: [face],
      indices: [index],
      confidence: 1.0
    }));

    while (clusters.length > 1) {
      let bestPair: { i: number; j: number; similarity: number } | null = null;

      // Find the most similar pair of clusters
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const similarity = this.calculateClusterDistance(
            clusters[i].indices,
            clusters[j].indices,
            similarityMatrix,
            linkageMethod
          );

          if (similarity >= threshold && (!bestPair || similarity > bestPair.similarity)) {
            bestPair = { i, j, similarity };
          }
        }
      }

      // If no similar pairs found, stop clustering
      if (!bestPair) {
        break;
      }

      // Merge the most similar clusters
      const { i, j } = bestPair;
      const mergedCluster = {
        faces: [...clusters[i].faces, ...clusters[j].faces],
        indices: [...clusters[i].indices, ...clusters[j].indices],
        confidence: bestPair.similarity
      };

      // Remove the merged clusters and add the new one
      clusters = [
        ...clusters.slice(0, i),
        ...clusters.slice(i + 1, j),
        ...clusters.slice(j + 1),
        mergedCluster
      ];
    }

    return clusters;
  }

  private calculateClusterDistance(
    cluster1Indices: number[],
    cluster2Indices: number[],
    similarityMatrix: number[][],
    linkageMethod: 'single' | 'complete' | 'average'
  ): number {
    const similarities: number[] = [];

    for (const i of cluster1Indices) {
      for (const j of cluster2Indices) {
        similarities.push(similarityMatrix[i][j]);
      }
    }

    switch (linkageMethod) {
      case 'single':
        return Math.max(...similarities);
      case 'complete':
        return Math.min(...similarities);
      case 'average':
        return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
      default:
        return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    }
  }

  private calculateClusterSimilarity(face: Face, cluster: PersonCluster): number {
    if (!face.embedding || cluster.faces.length === 0) {
      return 0;
    }

    const similarities = cluster.faces
      .filter(clusterFace => clusterFace.embedding)
      .map(clusterFace => 
        this.faceDetectionService.compareFaceEmbeddings(
          face.embedding!,
          clusterFace.embedding!
        )
      );

    if (similarities.length === 0) {
      return 0;
    }

    // Return average similarity
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }
}