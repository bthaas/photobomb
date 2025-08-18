import { PersonCluster, Face, Photo } from '../../types';
import { FaceClusteringService } from './FaceClusteringService';

export interface PersonLabel {
  id: string;
  name: string;
  clusterId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonSearchOptions {
  name?: string;
  minPhotos?: number;
  sortBy?: 'name' | 'photoCount' | 'confidence' | 'lastSeen';
  sortOrder?: 'asc' | 'desc';
}

export interface PersonStats {
  totalPeople: number;
  labeledPeople: number;
  unlabeledClusters: number;
  totalFaces: number;
  averagePhotosPerPerson: number;
}

/**
 * Person Management Service for handling person labeling and organization
 * Manages person clusters, labels, and provides search functionality
 */
export class PersonManagementService {
  private static instance: PersonManagementService;
  private faceClusteringService: FaceClusteringService;
  private personLabels: Map<string, PersonLabel> = new Map();

  private constructor() {
    this.faceClusteringService = FaceClusteringService.getInstance();
  }

  static getInstance(): PersonManagementService {
    if (!PersonManagementService.instance) {
      PersonManagementService.instance = new PersonManagementService();
    }
    return PersonManagementService.instance;
  }

  /**
   * Label a person cluster with a name
   */
  async labelPerson(clusterId: string, name: string): Promise<PersonLabel> {
    const existingLabel = this.personLabels.get(clusterId);
    
    if (existingLabel) {
      // Update existing label
      const updatedLabel: PersonLabel = {
        ...existingLabel,
        name,
        updatedAt: new Date()
      };
      
      this.personLabels.set(clusterId, updatedLabel);
      return updatedLabel;
    } else {
      // Create new label
      const newLabel: PersonLabel = {
        id: `label_${Date.now()}`,
        name,
        clusterId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.personLabels.set(clusterId, newLabel);
      return newLabel;
    }
  }

  /**
   * Remove label from a person cluster
   */
  async unlabelPerson(clusterId: string): Promise<boolean> {
    return this.personLabels.delete(clusterId);
  }

  /**
   * Get label for a person cluster
   */
  getPersonLabel(clusterId: string): PersonLabel | undefined {
    return this.personLabels.get(clusterId);
  }

  /**
   * Get all person labels
   */
  getAllPersonLabels(): PersonLabel[] {
    return Array.from(this.personLabels.values());
  }

  /**
   * Search for people by name or other criteria
   */
  searchPeople(
    clusters: PersonCluster[],
    options: PersonSearchOptions = {}
  ): PersonCluster[] {
    const {
      name,
      minPhotos = 0,
      sortBy = 'photoCount',
      sortOrder = 'desc'
    } = options;

    let filteredClusters = clusters.filter(cluster => {
      // Filter by minimum photos
      if (cluster.photos.length < minPhotos) {
        return false;
      }

      // Filter by name if provided
      if (name) {
        const label = this.getPersonLabel(cluster.id);
        if (!label || !label.name.toLowerCase().includes(name.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Sort results
    filteredClusters.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          const labelA = this.getPersonLabel(a.id);
          const labelB = this.getPersonLabel(b.id);
          const nameA = labelA?.name || 'Unnamed';
          const nameB = labelB?.name || 'Unnamed';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'photoCount':
          comparison = a.photos.length - b.photos.length;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'lastSeen':
          const lastSeenA = Math.max(...a.photos.map(p => p.updatedAt.getTime()));
          const lastSeenB = Math.max(...b.photos.map(p => p.updatedAt.getTime()));
          comparison = lastSeenA - lastSeenB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filteredClusters;
  }

  /**
   * Get statistics about people in the collection
   */
  getPersonStats(clusters: PersonCluster[]): PersonStats {
    const totalPeople = clusters.length;
    const labeledPeople = clusters.filter(cluster => 
      this.getPersonLabel(cluster.id)
    ).length;
    const unlabeledClusters = totalPeople - labeledPeople;
    const totalFaces = clusters.reduce((sum, cluster) => sum + cluster.faces.length, 0);
    const totalPhotos = clusters.reduce((sum, cluster) => sum + cluster.photos.length, 0);
    const averagePhotosPerPerson = totalPeople > 0 ? totalPhotos / totalPeople : 0;

    return {
      totalPeople,
      labeledPeople,
      unlabeledClusters,
      totalFaces,
      averagePhotosPerPerson
    };
  }

  /**
   * Suggest merge candidates for person clusters
   */
  async suggestMergeCandidates(
    clusters: PersonCluster[],
    similarityThreshold: number = 0.7
  ): Promise<Array<{ cluster1: PersonCluster; cluster2: PersonCluster; similarity: number }>> {
    const mergeCandidates: Array<{ cluster1: PersonCluster; cluster2: PersonCluster; similarity: number }> = [];

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const cluster1 = clusters[i];
        const cluster2 = clusters[j];

        // Skip if both clusters are already labeled with different names
        const label1 = this.getPersonLabel(cluster1.id);
        const label2 = this.getPersonLabel(cluster2.id);
        
        if (label1 && label2 && label1.name !== label2.name) {
          continue;
        }

        // Calculate similarity between clusters
        const similarity = await this.calculateClusterSimilarity(cluster1, cluster2);

        if (similarity >= similarityThreshold) {
          mergeCandidates.push({ cluster1, cluster2, similarity });
        }
      }
    }

    // Sort by similarity (highest first)
    return mergeCandidates.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Suggest split candidates for person clusters
   */
  async suggestSplitCandidates(
    clusters: PersonCluster[],
    minFacesForSplit: number = 10,
    maxInternalSimilarity: number = 0.5
  ): Promise<PersonCluster[]> {
    const splitCandidates: PersonCluster[] = [];

    for (const cluster of clusters) {
      if (cluster.faces.length < minFacesForSplit) {
        continue;
      }

      // Calculate internal similarity
      const internalSimilarity = await this.calculateInternalSimilarity(cluster);

      if (internalSimilarity < maxInternalSimilarity) {
        splitCandidates.push(cluster);
      }
    }

    // Sort by internal similarity (lowest first - most likely to need splitting)
    return splitCandidates.sort((a, b) => a.confidence - b.confidence);
  }

  /**
   * Merge person clusters and update labels
   */
  async mergePersonClusters(
    cluster1: PersonCluster,
    cluster2: PersonCluster,
    newName?: string
  ): Promise<PersonCluster> {
    // Merge the clusters
    const mergedCluster = this.faceClusteringService.mergeClusters(cluster1, cluster2);

    // Handle labels
    const label1 = this.getPersonLabel(cluster1.id);
    const label2 = this.getPersonLabel(cluster2.id);

    // Remove old labels
    this.personLabels.delete(cluster1.id);
    this.personLabels.delete(cluster2.id);

    // Create new label
    if (newName || label1 || label2) {
      const finalName = newName || label1?.name || label2?.name || 'Merged Person';
      await this.labelPerson(mergedCluster.id, finalName);
    }

    return mergedCluster;
  }

  /**
   * Split a person cluster and handle labels
   */
  async splitPersonCluster(
    cluster: PersonCluster,
    newNames?: string[]
  ): Promise<PersonCluster[]> {
    // Split the cluster
    const splitClusters = await this.faceClusteringService.splitCluster(cluster);

    // Handle labels
    const originalLabel = this.getPersonLabel(cluster.id);
    this.personLabels.delete(cluster.id);

    // Label the split clusters
    if (newNames && newNames.length === splitClusters.length) {
      for (let i = 0; i < splitClusters.length; i++) {
        await this.labelPerson(splitClusters[i].id, newNames[i]);
      }
    } else if (originalLabel && splitClusters.length > 0) {
      // Keep the original name for the largest cluster
      const largestCluster = splitClusters.reduce((largest, current) => 
        current.faces.length > largest.faces.length ? current : largest
      );
      await this.labelPerson(largestCluster.id, originalLabel.name);
    }

    return splitClusters;
  }

  /**
   * Find photos containing a specific person
   */
  findPhotosOfPerson(personCluster: PersonCluster, allPhotos: Photo[]): Photo[] {
    const faceIds = new Set(personCluster.faces.map(face => face.id));
    
    return allPhotos.filter(photo => 
      photo.faces?.some(face => faceIds.has(face.id))
    );
  }

  /**
   * Get the best representative face for a person cluster
   */
  getBestRepresentativeFace(cluster: PersonCluster): Face | null {
    if (cluster.faces.length === 0) {
      return null;
    }

    // Sort faces by confidence and quality attributes
    const sortedFaces = cluster.faces.sort((a, b) => {
      const scoreA = this.calculateFaceScore(a);
      const scoreB = this.calculateFaceScore(b);
      return scoreB - scoreA;
    });

    return sortedFaces[0];
  }

  // Private helper methods

  private async calculateClusterSimilarity(
    cluster1: PersonCluster,
    cluster2: PersonCluster
  ): Promise<number> {
    if (cluster1.faces.length === 0 || cluster2.faces.length === 0) {
      return 0;
    }

    const similarities: number[] = [];

    // Compare each face in cluster1 with each face in cluster2
    for (const face1 of cluster1.faces) {
      if (!face1.embedding) continue;
      
      for (const face2 of cluster2.faces) {
        if (!face2.embedding) continue;
        
        const similarity = this.faceClusteringService['faceDetectionService'].compareFaceEmbeddings(
          face1.embedding,
          face2.embedding
        );
        similarities.push(similarity);
      }
    }

    if (similarities.length === 0) {
      return 0;
    }

    // Return average similarity
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }

  private async calculateInternalSimilarity(cluster: PersonCluster): Promise<number> {
    if (cluster.faces.length < 2) {
      return 1.0;
    }

    const similarities: number[] = [];

    // Compare each face with every other face in the cluster
    for (let i = 0; i < cluster.faces.length; i++) {
      const face1 = cluster.faces[i];
      if (!face1.embedding) continue;

      for (let j = i + 1; j < cluster.faces.length; j++) {
        const face2 = cluster.faces[j];
        if (!face2.embedding) continue;

        const similarity = this.faceClusteringService['faceDetectionService'].compareFaceEmbeddings(
          face1.embedding,
          face2.embedding
        );
        similarities.push(similarity);
      }
    }

    if (similarities.length === 0) {
      return 1.0;
    }

    // Return average internal similarity
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }

  private calculateFaceScore(face: Face): number {
    let score = face.confidence;

    // Boost score for faces with good attributes
    if (face.attributes.smile && face.attributes.smile > 0.5) {
      score += 0.1;
    }
    
    if (face.attributes.eyesOpen && face.attributes.eyesOpen > 0.8) {
      score += 0.1;
    }

    // Boost score for larger faces (better quality)
    const faceArea = face.boundingBox.width * face.boundingBox.height;
    if (faceArea > 0.1) { // Assuming normalized coordinates
      score += 0.1;
    }

    return Math.min(1.0, score);
  }
}