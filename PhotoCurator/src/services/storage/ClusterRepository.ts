/**
 * Repository for cluster data access operations
 */

import { PhotoCluster, PersonCluster, EventCluster, ClusterType } from '../../types';
import { DatabaseService } from './DatabaseService';

export interface ClusterFilter {
  type?: ClusterType;
  confidenceThreshold?: number;
  hasLabel?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export class ClusterRepository {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Create a new photo cluster
   */
  public async createPhotoCluster(cluster: PhotoCluster): Promise<void> {
    const sql = `
      INSERT INTO clusters (id, type, centroid, confidence, label, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      cluster.id,
      cluster.type,
      JSON.stringify(cluster.centroid),
      cluster.confidence,
      cluster.label || null,
      cluster.createdAt.getTime(),
      cluster.updatedAt.getTime(),
    ];

    await this.dbService.executeSql(sql, params);
  }

  /**
   * Create a new person cluster
   */
  public async createPersonCluster(cluster: PersonCluster): Promise<void> {
    const sql = `
      INSERT INTO person_clusters (id, name, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      cluster.id,
      cluster.name || null,
      cluster.confidence,
      cluster.createdAt.getTime(),
      cluster.updatedAt.getTime(),
    ];

    await this.dbService.executeSql(sql, params);

    // Update faces to reference this person cluster
    if (cluster.faces && cluster.faces.length > 0) {
      const faceIds = cluster.faces.map(face => face.id);
      await this.updateFacePersonCluster(faceIds, cluster.id);
    }
  }

  /**
   * Create a new event cluster
   */
  public async createEventCluster(cluster: EventCluster): Promise<void> {
    const sql = `
      INSERT INTO event_clusters (
        id, name, time_range_start, time_range_end, 
        location_latitude, location_longitude, confidence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      cluster.id,
      cluster.name || null,
      cluster.timeRange.start.getTime(),
      cluster.timeRange.end.getTime(),
      cluster.location?.latitude || null,
      cluster.location?.longitude || null,
      cluster.confidence,
      cluster.createdAt.getTime(),
      cluster.updatedAt.getTime(),
    ];

    await this.dbService.executeSql(sql, params);
  }

  /**
   * Find photo cluster by ID
   */
  public async findPhotoClusterById(id: string): Promise<PhotoCluster | null> {
    const sql = 'SELECT * FROM clusters WHERE id = ?';
    const result = await this.dbService.executeSql(sql, [id]);
    
    if (result.length === 0) {
      return null;
    }

    const cluster = this.mapRowToPhotoCluster(result[0]);
    cluster.photos = await this.getPhotosByClusterId(id);
    
    return cluster;
  }

  /**
   * Find person cluster by ID
   */
  public async findPersonClusterById(id: string): Promise<PersonCluster | null> {
    const sql = 'SELECT * FROM person_clusters WHERE id = ?';
    const result = await this.dbService.executeSql(sql, [id]);
    
    if (result.length === 0) {
      return null;
    }

    const cluster = this.mapRowToPersonCluster(result[0]);
    cluster.faces = await this.getFacesByPersonClusterId(id);
    cluster.photos = await this.getPhotosByPersonClusterId(id);
    
    return cluster;
  }

  /**
   * Find event cluster by ID
   */
  public async findEventClusterById(id: string): Promise<EventCluster | null> {
    const sql = 'SELECT * FROM event_clusters WHERE id = ?';
    const result = await this.dbService.executeSql(sql, [id]);
    
    if (result.length === 0) {
      return null;
    }

    const cluster = this.mapRowToEventCluster(result[0]);
    cluster.photos = await this.getPhotosByEventClusterId(id);
    
    return cluster;
  }

  /**
   * Find photo clusters with filters
   */
  public async findPhotoClusters(
    filter: ClusterFilter = {},
    limit = 50,
    offset = 0
  ): Promise<PhotoCluster[]> {
    let sql = 'SELECT * FROM clusters WHERE 1=1';
    const params: any[] = [];

    // Apply filters
    if (filter.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter.confidenceThreshold !== undefined) {
      sql += ' AND confidence >= ?';
      params.push(filter.confidenceThreshold);
    }

    if (filter.hasLabel !== undefined) {
      sql += filter.hasLabel 
        ? ' AND label IS NOT NULL'
        : ' AND label IS NULL';
    }

    if (filter.dateRange) {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(filter.dateRange.start.getTime(), filter.dateRange.end.getTime());
    }

    // Order by confidence descending
    sql += ' ORDER BY confidence DESC';

    // Apply pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.dbService.executeSql(sql, params);
    const clusters = result.map(row => this.mapRowToPhotoCluster(row));

    // Load photos for each cluster
    for (const cluster of clusters) {
      cluster.photos = await this.getPhotosByClusterId(cluster.id);
    }

    return clusters;
  }

  /**
   * Find person clusters
   */
  public async findPersonClusters(limit = 50, offset = 0): Promise<PersonCluster[]> {
    const sql = 'SELECT * FROM person_clusters ORDER BY confidence DESC LIMIT ? OFFSET ?';
    const result = await this.dbService.executeSql(sql, [limit, offset]);
    const clusters = result.map(row => this.mapRowToPersonCluster(row));

    // Load faces and photos for each cluster
    for (const cluster of clusters) {
      cluster.faces = await this.getFacesByPersonClusterId(cluster.id);
      cluster.photos = await this.getPhotosByPersonClusterId(cluster.id);
    }

    return clusters;
  }

  /**
   * Find event clusters
   */
  public async findEventClusters(limit = 50, offset = 0): Promise<EventCluster[]> {
    const sql = 'SELECT * FROM event_clusters ORDER BY time_range_start DESC LIMIT ? OFFSET ?';
    const result = await this.dbService.executeSql(sql, [limit, offset]);
    const clusters = result.map(row => this.mapRowToEventCluster(row));

    // Load photos for each cluster
    for (const cluster of clusters) {
      cluster.photos = await this.getPhotosByEventClusterId(cluster.id);
    }

    return clusters;
  }

  /**
   * Update photo cluster
   */
  public async updatePhotoCluster(id: string, updates: Partial<PhotoCluster>): Promise<void> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.centroid !== undefined) {
      updateFields.push('centroid = ?');
      params.push(JSON.stringify(updates.centroid));
    }

    if (updates.confidence !== undefined) {
      updateFields.push('confidence = ?');
      params.push(updates.confidence);
    }

    if (updates.label !== undefined) {
      updateFields.push('label = ?');
      params.push(updates.label);
    }

    if (updateFields.length === 0) {
      return;
    }

    updateFields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    const sql = `UPDATE clusters SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.dbService.executeSql(sql, params);
  }

  /**
   * Update person cluster
   */
  public async updatePersonCluster(id: string, updates: Partial<PersonCluster>): Promise<void> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }

    if (updates.confidence !== undefined) {
      updateFields.push('confidence = ?');
      params.push(updates.confidence);
    }

    if (updateFields.length === 0) {
      return;
    }

    updateFields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    const sql = `UPDATE person_clusters SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.dbService.executeSql(sql, params);
  }

  /**
   * Update event cluster
   */
  public async updateEventCluster(id: string, updates: Partial<EventCluster>): Promise<void> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updates.name);
    }

    if (updates.timeRange !== undefined) {
      updateFields.push('time_range_start = ?');
      params.push(updates.timeRange.start.getTime());
      updateFields.push('time_range_end = ?');
      params.push(updates.timeRange.end.getTime());
    }

    if (updates.location !== undefined) {
      updateFields.push('location_latitude = ?');
      params.push(updates.location?.latitude || null);
      updateFields.push('location_longitude = ?');
      params.push(updates.location?.longitude || null);
    }

    if (updates.confidence !== undefined) {
      updateFields.push('confidence = ?');
      params.push(updates.confidence);
    }

    if (updateFields.length === 0) {
      return;
    }

    updateFields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    const sql = `UPDATE event_clusters SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.dbService.executeSql(sql, params);
  }

  /**
   * Delete photo cluster
   */
  public async deletePhotoCluster(id: string): Promise<void> {
    // First, remove cluster references from photos
    await this.dbService.executeSql('UPDATE photos SET cluster_id = NULL WHERE cluster_id = ?', [id]);
    
    // Then delete the cluster
    await this.dbService.executeSql('DELETE FROM clusters WHERE id = ?', [id]);
  }

  /**
   * Delete person cluster
   */
  public async deletePersonCluster(id: string): Promise<void> {
    // First, remove person cluster references from faces
    await this.dbService.executeSql('UPDATE faces SET person_cluster_id = NULL WHERE person_cluster_id = ?', [id]);
    
    // Then delete the cluster
    await this.dbService.executeSql('DELETE FROM person_clusters WHERE id = ?', [id]);
  }

  /**
   * Delete event cluster
   */
  public async deleteEventCluster(id: string): Promise<void> {
    await this.dbService.executeSql('DELETE FROM event_clusters WHERE id = ?', [id]);
  }

  /**
   * Merge two person clusters
   */
  public async mergePersonClusters(sourceId: string, targetId: string): Promise<void> {
    await this.dbService.executeTransaction(async (tx) => {
      // Move all faces from source to target cluster
      await this.dbService.executeSql(
        'UPDATE faces SET person_cluster_id = ? WHERE person_cluster_id = ?',
        [targetId, sourceId]
      );

      // Delete the source cluster
      await this.dbService.executeSql('DELETE FROM person_clusters WHERE id = ?', [sourceId]);

      // Update target cluster timestamp
      await this.dbService.executeSql(
        'UPDATE person_clusters SET updated_at = ? WHERE id = ?',
        [Date.now(), targetId]
      );
    });
  }

  /**
   * Get photos by cluster ID
   */
  private async getPhotosByClusterId(clusterId: string): Promise<any[]> {
    const sql = 'SELECT * FROM photos WHERE cluster_id = ? ORDER BY timestamp DESC';
    return await this.dbService.executeSql(sql, [clusterId]);
  }

  /**
   * Get photos by person cluster ID
   */
  private async getPhotosByPersonClusterId(personClusterId: string): Promise<any[]> {
    const sql = `
      SELECT DISTINCT p.* FROM photos p
      INNER JOIN faces f ON p.id = f.photo_id
      WHERE f.person_cluster_id = ?
      ORDER BY p.timestamp DESC
    `;
    return await this.dbService.executeSql(sql, [personClusterId]);
  }

  /**
   * Get photos by event cluster ID
   */
  private async getPhotosByEventClusterId(eventClusterId: string): Promise<any[]> {
    // For now, we'll need to implement a way to link photos to event clusters
    // This could be done through a separate junction table or by time/location matching
    return [];
  }

  /**
   * Get faces by person cluster ID
   */
  private async getFacesByPersonClusterId(personClusterId: string): Promise<any[]> {
    const sql = 'SELECT * FROM faces WHERE person_cluster_id = ?';
    return await this.dbService.executeSql(sql, [personClusterId]);
  }

  /**
   * Update face person cluster assignment
   */
  private async updateFacePersonCluster(faceIds: string[], personClusterId: string): Promise<void> {
    if (faceIds.length === 0) return;

    const placeholders = faceIds.map(() => '?').join(',');
    const sql = `UPDATE faces SET person_cluster_id = ? WHERE id IN (${placeholders})`;
    const params = [personClusterId, ...faceIds];

    await this.dbService.executeSql(sql, params);
  }

  /**
   * Map database row to PhotoCluster object
   */
  private mapRowToPhotoCluster(row: any): PhotoCluster {
    return {
      id: row.id,
      type: row.type as ClusterType,
      photos: [], // Will be populated separately
      centroid: JSON.parse(row.centroid),
      confidence: row.confidence,
      label: row.label,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to PersonCluster object
   */
  private mapRowToPersonCluster(row: any): PersonCluster {
    return {
      id: row.id,
      name: row.name,
      faces: [], // Will be populated separately
      photos: [], // Will be populated separately
      confidence: row.confidence,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to EventCluster object
   */
  private mapRowToEventCluster(row: any): EventCluster {
    return {
      id: row.id,
      name: row.name,
      photos: [], // Will be populated separately
      timeRange: {
        start: new Date(row.time_range_start),
        end: new Date(row.time_range_end),
      },
      location: row.location_latitude && row.location_longitude ? {
        latitude: row.location_latitude,
        longitude: row.location_longitude,
      } : undefined,
      confidence: row.confidence,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default ClusterRepository;