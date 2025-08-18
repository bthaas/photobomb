/**
 * ClusteringService - Main service for photo clustering and organization
 * Implements visual similarity, time/location-based clustering algorithms
 */

import {
  Photo,
  PhotoCluster,
  EventCluster,
  ClusterType,
  ClusteringResult,
  TimeRange,
  GeoLocation,
  ImageFeatures
} from '../../types';

export interface ClusteringConfig {
  visualSimilarityThreshold: number;
  timeThresholdHours: number;
  locationThresholdMeters: number;
  minClusterSize: number;
  maxClusterSize: number;
}

export interface ClusterMergeResult {
  mergedCluster: PhotoCluster;
  removedClusterIds: string[];
}

export interface ClusterSplitResult {
  originalCluster: PhotoCluster;
  newClusters: PhotoCluster[];
}

export class ClusteringService {
  private config: ClusteringConfig;

  constructor(config: Partial<ClusteringConfig> = {}) {
    this.config = {
      visualSimilarityThreshold: 0.8,
      timeThresholdHours: 2,
      locationThresholdMeters: 100,
      minClusterSize: 2,
      maxClusterSize: 50,
      ...config
    };
  }

  /**
   * Cluster photos by visual similarity using image embeddings
   */
  async clusterByVisualSimilarity(photos: Photo[]): Promise<ClusteringResult> {
    const startTime = Date.now();
    
    // Filter photos that have image features
    const photosWithFeatures = photos.filter(photo => 
      photo.features && photo.features.embedding.length > 0
    );

    if (photosWithFeatures.length < 2) {
      return {
        clusters: [],
        unclusteredPhotos: photos,
        processingTime: Date.now() - startTime,
        algorithm: 'visual_similarity',
        parameters: { threshold: this.config.visualSimilarityThreshold }
      };
    }

    const clusters: PhotoCluster[] = [];
    const processed = new Set<string>();

    for (const photo of photosWithFeatures) {
      if (processed.has(photo.id)) continue;

      const cluster = await this.createVisualSimilarityCluster(photo, photosWithFeatures, processed);
      if (cluster.photos.length >= this.config.minClusterSize) {
        clusters.push(cluster);
      }
    }

    const clusteredPhotoIds = new Set(
      clusters.flatMap(cluster => cluster.photos.map(p => p.id))
    );
    const unclusteredPhotos = photos.filter(photo => !clusteredPhotoIds.has(photo.id));

    return {
      clusters,
      unclusteredPhotos,
      processingTime: Date.now() - startTime,
      algorithm: 'visual_similarity',
      parameters: { threshold: this.config.visualSimilarityThreshold }
    };
  }

  /**
   * Cluster photos by time and location proximity
   */
  async clusterByTimeAndLocation(photos: Photo[]): Promise<ClusteringResult> {
    const startTime = Date.now();
    
    // Sort photos by timestamp
    const sortedPhotos = [...photos].sort((a, b) => 
      a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
    );

    const clusters: PhotoCluster[] = [];
    const processed = new Set<string>();

    for (const photo of sortedPhotos) {
      if (processed.has(photo.id)) continue;

      const cluster = await this.createTimeLocationCluster(photo, sortedPhotos, processed);
      if (cluster.photos.length >= this.config.minClusterSize) {
        clusters.push(cluster);
      }
    }

    const clusteredPhotoIds = new Set(
      clusters.flatMap(cluster => cluster.photos.map(p => p.id))
    );
    const unclusteredPhotos = photos.filter(photo => !clusteredPhotoIds.has(photo.id));

    return {
      clusters,
      unclusteredPhotos,
      processingTime: Date.now() - startTime,
      algorithm: 'time_location',
      parameters: { 
        timeThresholdHours: this.config.timeThresholdHours,
        locationThresholdMeters: this.config.locationThresholdMeters
      }
    };
  }

  /**
   * Create event clusters based on time ranges and locations
   */
  async createEventClusters(photos: Photo[]): Promise<EventCluster[]> {
    const timeLocationResult = await this.clusterByTimeAndLocation(photos);
    
    return timeLocationResult.clusters.map(cluster => {
      const timeRange = this.calculateTimeRange(cluster.photos);
      const location = this.calculateCenterLocation(cluster.photos);
      
      return {
        id: `event_${cluster.id}`,
        name: this.generateEventName(cluster.photos, timeRange, location),
        photos: cluster.photos,
        timeRange,
        location,
        confidence: cluster.confidence,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
  }

  /**
   * Merge multiple clusters into one
   */
  async mergeClusters(clusterIds: string[], clusters: PhotoCluster[]): Promise<ClusterMergeResult> {
    const clustersToMerge = clusters.filter(c => clusterIds.includes(c.id));
    
    if (clustersToMerge.length < 2) {
      throw new Error('At least 2 clusters are required for merging');
    }

    const allPhotos = clustersToMerge.flatMap(c => c.photos);
    const mergedCentroid = this.calculateMergedCentroid(clustersToMerge);
    
    const mergedCluster: PhotoCluster = {
      id: `merged_${Date.now()}`,
      type: clustersToMerge[0].type,
      photos: allPhotos,
      centroid: mergedCentroid,
      confidence: this.calculateMergedConfidence(clustersToMerge),
      label: this.generateMergedLabel(clustersToMerge),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      mergedCluster,
      removedClusterIds: clusterIds
    };
  }

  /**
   * Split a cluster into multiple smaller clusters
   */
  async splitCluster(clusterId: string, clusters: PhotoCluster[], splitCount: number = 2): Promise<ClusterSplitResult> {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) {
      throw new Error(`Cluster with id ${clusterId} not found`);
    }

    if (cluster.photos.length < splitCount * this.config.minClusterSize) {
      throw new Error('Cluster too small to split into the requested number of clusters');
    }

    // Use k-means clustering to split the photos
    const newClusters = await this.kMeansCluster(cluster.photos, splitCount);
    
    return {
      originalCluster: cluster,
      newClusters: newClusters.map((photos, index) => ({
        id: `${clusterId}_split_${index}`,
        type: cluster.type,
        photos,
        centroid: this.calculateCentroid(photos),
        confidence: this.calculateClusterConfidence(photos),
        label: `${cluster.label || 'Cluster'} - Part ${index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    };
  }

  /**
   * Calculate similarity between two photos based on their features
   */
  private calculateVisualSimilarity(photo1: Photo, photo2: Photo): number {
    if (!photo1.features?.embedding || !photo2.features?.embedding) {
      return 0;
    }

    return this.cosineSimilarity(photo1.features.embedding, photo2.features.embedding);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    
    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    
    // Ensure similarity is between -1 and 1
    return Math.max(-1, Math.min(1, similarity));
  }

  /**
   * Create a visual similarity cluster starting from a seed photo
   */
  private async createVisualSimilarityCluster(
    seedPhoto: Photo,
    allPhotos: Photo[],
    processed: Set<string>
  ): Promise<PhotoCluster> {
    const clusterPhotos = [seedPhoto];
    processed.add(seedPhoto.id);

    // Find all photos similar to the seed photo
    const similarPhotos: { photo: Photo; similarity: number }[] = [];
    
    for (const photo of allPhotos) {
      if (processed.has(photo.id)) continue;

      const similarity = this.calculateVisualSimilarity(seedPhoto, photo);
      if (similarity >= this.config.visualSimilarityThreshold) {
        similarPhotos.push({ photo, similarity });
      }
    }

    // Sort by similarity (highest first) and add to cluster
    similarPhotos
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.config.maxClusterSize - 1) // -1 because we already have the seed photo
      .forEach(({ photo }) => {
        clusterPhotos.push(photo);
        processed.add(photo.id);
      });

    return {
      id: `visual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: ClusterType.VISUAL_SIMILARITY,
      photos: clusterPhotos,
      centroid: this.calculateCentroid(clusterPhotos),
      confidence: this.calculateClusterConfidence(clusterPhotos),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create a time/location cluster starting from a seed photo
   */
  private async createTimeLocationCluster(
    seedPhoto: Photo,
    allPhotos: Photo[],
    processed: Set<string>
  ): Promise<PhotoCluster> {
    const clusterPhotos = [seedPhoto];
    processed.add(seedPhoto.id);

    const seedTime = seedPhoto.metadata.timestamp.getTime();
    const seedLocation = seedPhoto.metadata.location;

    for (const photo of allPhotos) {
      if (processed.has(photo.id)) continue;

      const timeDistance = Math.abs(photo.metadata.timestamp.getTime() - seedTime);
      const timeThreshold = this.config.timeThresholdHours * 60 * 60 * 1000; // Convert to milliseconds

      if (timeDistance <= timeThreshold) {
        // Check location proximity if both photos have location data
        if (seedLocation && photo.metadata.location) {
          const locationDistance = this.calculateDistance(seedLocation, photo.metadata.location);
          if (locationDistance <= this.config.locationThresholdMeters) {
            clusterPhotos.push(photo);
            processed.add(photo.id);
          }
        } else {
          // If no location data, cluster by time only
          clusterPhotos.push(photo);
          processed.add(photo.id);
        }

        if (clusterPhotos.length >= this.config.maxClusterSize) break;
      }
    }

    return {
      id: `time_loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: ClusterType.EVENT,
      photos: clusterPhotos,
      centroid: this.calculateCentroid(clusterPhotos),
      confidence: this.calculateClusterConfidence(clusterPhotos),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Calculate distance between two geographic locations in meters
   */
  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Calculate centroid for a cluster of photos
   */
  private calculateCentroid(photos: Photo[]): number[] {
    const photosWithFeatures = photos.filter(p => p.features?.embedding);
    if (photosWithFeatures.length === 0) return [];

    const embeddingLength = photosWithFeatures[0].features!.embedding.length;
    const centroid = new Array(embeddingLength).fill(0);

    for (const photo of photosWithFeatures) {
      const embedding = photo.features!.embedding;
      for (let i = 0; i < embeddingLength; i++) {
        centroid[i] += embedding[i];
      }
    }

    // Average the values
    for (let i = 0; i < embeddingLength; i++) {
      centroid[i] /= photosWithFeatures.length;
    }

    return centroid;
  }

  /**
   * Calculate confidence score for a cluster
   */
  private calculateClusterConfidence(photos: Photo[]): number {
    if (photos.length < 2) return 0;

    const photosWithFeatures = photos.filter(p => p.features?.embedding);
    if (photosWithFeatures.length < 2) return 0.5;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < photosWithFeatures.length; i++) {
      for (let j = i + 1; j < photosWithFeatures.length; j++) {
        totalSimilarity += this.calculateVisualSimilarity(photosWithFeatures[i], photosWithFeatures[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0.5;
  }

  /**
   * Calculate time range for a group of photos
   */
  private calculateTimeRange(photos: Photo[]): TimeRange {
    const timestamps = photos.map(p => p.metadata.timestamp.getTime());
    return {
      start: new Date(Math.min(...timestamps)),
      end: new Date(Math.max(...timestamps))
    };
  }

  /**
   * Calculate center location for a group of photos
   */
  private calculateCenterLocation(photos: Photo[]): GeoLocation | undefined {
    const photosWithLocation = photos.filter(p => p.metadata.location);
    if (photosWithLocation.length === 0) return undefined;

    const avgLat = photosWithLocation.reduce((sum, p) => sum + p.metadata.location!.latitude, 0) / photosWithLocation.length;
    const avgLng = photosWithLocation.reduce((sum, p) => sum + p.metadata.location!.longitude, 0) / photosWithLocation.length;

    return {
      latitude: avgLat,
      longitude: avgLng
    };
  }

  /**
   * Generate event name based on photos, time, and location
   */
  private generateEventName(photos: Photo[], timeRange: TimeRange, location?: GeoLocation): string {
    const date = timeRange.start.toLocaleDateString();
    const photoCount = photos.length;
    
    if (location) {
      return `Event at ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)} - ${date} (${photoCount} photos)`;
    }
    
    return `Event on ${date} (${photoCount} photos)`;
  }

  /**
   * Calculate merged centroid from multiple clusters
   */
  private calculateMergedCentroid(clusters: PhotoCluster[]): number[] {
    const allPhotos = clusters.flatMap(c => c.photos);
    return this.calculateCentroid(allPhotos);
  }

  /**
   * Calculate merged confidence from multiple clusters
   */
  private calculateMergedConfidence(clusters: PhotoCluster[]): number {
    const totalPhotos = clusters.reduce((sum, c) => sum + c.photos.length, 0);
    const weightedConfidence = clusters.reduce((sum, c) => sum + (c.confidence * c.photos.length), 0);
    return weightedConfidence / totalPhotos;
  }

  /**
   * Generate label for merged cluster
   */
  private generateMergedLabel(clusters: PhotoCluster[]): string {
    const labels = clusters.map(c => c.label).filter(Boolean);
    if (labels.length > 0) {
      return `Merged: ${labels.join(', ')}`;
    }
    return `Merged Cluster (${clusters.length} clusters)`;
  }

  /**
   * K-means clustering implementation for splitting clusters
   */
  private async kMeansCluster(photos: Photo[], k: number): Promise<Photo[][]> {
    const photosWithFeatures = photos.filter(p => p.features?.embedding);
    if (photosWithFeatures.length < k) {
      // If not enough photos with features, split randomly
      return this.randomSplit(photos, k);
    }

    // Initialize centroids randomly
    const centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const randomPhoto = photosWithFeatures[Math.floor(Math.random() * photosWithFeatures.length)];
      centroids.push([...randomPhoto.features!.embedding]);
    }

    let assignments = new Array(photosWithFeatures.length).fill(0);
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Assign each photo to nearest centroid
      for (let i = 0; i < photosWithFeatures.length; i++) {
        const photo = photosWithFeatures[i];
        let bestCluster = 0;
        let bestDistance = Infinity;

        for (let j = 0; j < k; j++) {
          const similarity = this.cosineSimilarity(photo.features!.embedding, centroids[j]);
          const distance = 1 - similarity; // Convert similarity to distance
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestCluster = j;
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          changed = true;
        }
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPhotos = photosWithFeatures.filter((_, i) => assignments[i] === j);
        if (clusterPhotos.length > 0) {
          centroids[j] = this.calculateCentroid(clusterPhotos);
        }
      }
    }

    // Group photos by cluster assignment
    const clusters: Photo[][] = new Array(k).fill(null).map(() => []);
    for (let i = 0; i < photosWithFeatures.length; i++) {
      clusters[assignments[i]].push(photosWithFeatures[i]);
    }

    // Add photos without features to random clusters
    const photosWithoutFeatures = photos.filter(p => !p.features?.embedding);
    for (const photo of photosWithoutFeatures) {
      const randomCluster = Math.floor(Math.random() * k);
      clusters[randomCluster].push(photo);
    }

    return clusters.filter(cluster => cluster.length > 0);
  }

  /**
   * Random split fallback for k-means
   */
  private randomSplit(photos: Photo[], k: number): Photo[][] {
    const shuffled = [...photos].sort(() => Math.random() - 0.5);
    const clusters: Photo[][] = new Array(k).fill(null).map(() => []);
    
    for (let i = 0; i < shuffled.length; i++) {
      clusters[i % k].push(shuffled[i]);
    }
    
    return clusters;
  }
}