/**
 * Repository for photo data access operations
 */

import { Photo, PhotoMetadata, Face, SyncStatus, ImageFeatures, QualityScore, CompositionScore, ContentScore } from '../../types';
import { DatabaseService } from './DatabaseService';

export interface PhotoFilter {
  clusterId?: string;
  syncStatus?: SyncStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  hasFeatures?: boolean;
  hasFaces?: boolean;
  qualityThreshold?: number;
}

export interface PhotoSort {
  field: 'timestamp' | 'quality_overall' | 'created_at' | 'updated_at';
  direction: 'ASC' | 'DESC';
}

export class PhotoRepository {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Create a new photo record
   */
  public async create(photo: Photo): Promise<void> {
    const sql = `
      INSERT INTO photos (
        id, uri, width, height, file_size, format, timestamp,
        exif_data, location_latitude, location_longitude, location_altitude, location_accuracy,
        features_embedding, dominant_colors, detected_objects, detected_scenes,
        quality_overall, quality_sharpness, quality_exposure, quality_color_balance, quality_noise,
        composition_overall, composition_rule_of_thirds, composition_leading_lines, 
        composition_symmetry, composition_subject_placement,
        content_overall, content_face_quality, content_emotional_sentiment, content_interestingness,
        cluster_id, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      photo.id,
      photo.uri,
      photo.metadata.width,
      photo.metadata.height,
      photo.metadata.fileSize,
      photo.metadata.format,
      photo.metadata.timestamp.getTime(),
      photo.metadata.exif ? JSON.stringify(photo.metadata.exif) : null,
      photo.metadata.location?.latitude || null,
      photo.metadata.location?.longitude || null,
      photo.metadata.location?.altitude || null,
      photo.metadata.location?.accuracy || null,
      photo.features?.embedding ? JSON.stringify(photo.features.embedding) : null,
      photo.features?.dominantColors ? JSON.stringify(photo.features.dominantColors) : null,
      photo.features?.objects ? JSON.stringify(photo.features.objects) : null,
      photo.features?.scenes ? JSON.stringify(photo.features.scenes) : null,
      photo.qualityScore?.overall || null,
      photo.qualityScore?.sharpness || null,
      photo.qualityScore?.exposure || null,
      photo.qualityScore?.colorBalance || null,
      photo.qualityScore?.noise || null,
      photo.compositionScore?.overall || null,
      photo.compositionScore?.ruleOfThirds || null,
      photo.compositionScore?.leadingLines || null,
      photo.compositionScore?.symmetry || null,
      photo.compositionScore?.subjectPlacement || null,
      photo.contentScore?.overall || null,
      photo.contentScore?.faceQuality || null,
      photo.contentScore?.emotionalSentiment || null,
      photo.contentScore?.interestingness || null,
      photo.clusterId || null,
      photo.syncStatus,
      photo.createdAt.getTime(),
      photo.updatedAt.getTime(),
    ];

    await this.dbService.executeSql(sql, params);

    // Insert faces if they exist
    if (photo.faces && photo.faces.length > 0) {
      await this.insertFaces(photo.id, photo.faces);
    }
  }

  /**
   * Find photo by ID
   */
  public async findById(id: string): Promise<Photo | null> {
    const sql = 'SELECT * FROM photos WHERE id = ?';
    const result = await this.dbService.executeSql(sql, [id]);
    
    if (result.length === 0) {
      return null;
    }

    const photo = this.mapRowToPhoto(result[0]);
    photo.faces = await this.getFacesByPhotoId(id);
    
    return photo;
  }

  /**
   * Find photos with filters and pagination
   */
  public async find(
    filter: PhotoFilter = {},
    sort: PhotoSort = { field: 'timestamp', direction: 'DESC' },
    limit = 50,
    offset = 0
  ): Promise<Photo[]> {
    let sql = 'SELECT * FROM photos WHERE 1=1';
    const params: any[] = [];

    // Apply filters
    if (filter.clusterId) {
      sql += ' AND cluster_id = ?';
      params.push(filter.clusterId);
    }

    if (filter.syncStatus) {
      sql += ' AND sync_status = ?';
      params.push(filter.syncStatus);
    }

    if (filter.dateRange) {
      sql += ' AND timestamp BETWEEN ? AND ?';
      params.push(filter.dateRange.start.getTime(), filter.dateRange.end.getTime());
    }

    if (filter.location) {
      // Use Haversine formula for location filtering
      sql += ` AND (
        6371 * acos(
          cos(radians(?)) * cos(radians(location_latitude)) * 
          cos(radians(location_longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(location_latitude))
        )
      ) <= ?`;
      params.push(
        filter.location.latitude,
        filter.location.longitude,
        filter.location.latitude,
        filter.location.radius
      );
    }

    if (filter.hasFeatures !== undefined) {
      sql += filter.hasFeatures 
        ? ' AND features_embedding IS NOT NULL'
        : ' AND features_embedding IS NULL';
    }

    if (filter.hasFaces !== undefined) {
      const faceCondition = filter.hasFaces 
        ? 'EXISTS (SELECT 1 FROM faces WHERE faces.photo_id = photos.id)'
        : 'NOT EXISTS (SELECT 1 FROM faces WHERE faces.photo_id = photos.id)';
      sql += ` AND ${faceCondition}`;
    }

    if (filter.qualityThreshold !== undefined) {
      sql += ' AND quality_overall >= ?';
      params.push(filter.qualityThreshold);
    }

    // Apply sorting
    sql += ` ORDER BY ${sort.field} ${sort.direction}`;

    // Apply pagination
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.dbService.executeSql(sql, params);
    const photos = result.map(row => this.mapRowToPhoto(row));

    // Load faces for each photo
    for (const photo of photos) {
      photo.faces = await this.getFacesByPhotoId(photo.id);
    }

    return photos;
  }

  /**
   * Update photo
   */
  public async update(id: string, updates: Partial<Photo>): Promise<void> {
    const updateFields: string[] = [];
    const params: any[] = [];

    // Build dynamic update query
    if (updates.uri !== undefined) {
      updateFields.push('uri = ?');
      params.push(updates.uri);
    }

    if (updates.metadata) {
      if (updates.metadata.width !== undefined) {
        updateFields.push('width = ?');
        params.push(updates.metadata.width);
      }
      if (updates.metadata.height !== undefined) {
        updateFields.push('height = ?');
        params.push(updates.metadata.height);
      }
      // Add other metadata fields as needed
    }

    if (updates.features) {
      updateFields.push('features_embedding = ?');
      params.push(JSON.stringify(updates.features.embedding));
      updateFields.push('dominant_colors = ?');
      params.push(JSON.stringify(updates.features.dominantColors));
      updateFields.push('detected_objects = ?');
      params.push(JSON.stringify(updates.features.objects));
      updateFields.push('detected_scenes = ?');
      params.push(JSON.stringify(updates.features.scenes));
    }

    if (updates.qualityScore) {
      updateFields.push('quality_overall = ?');
      params.push(updates.qualityScore.overall);
      updateFields.push('quality_sharpness = ?');
      params.push(updates.qualityScore.sharpness);
      updateFields.push('quality_exposure = ?');
      params.push(updates.qualityScore.exposure);
      updateFields.push('quality_color_balance = ?');
      params.push(updates.qualityScore.colorBalance);
      updateFields.push('quality_noise = ?');
      params.push(updates.qualityScore.noise);
    }

    if (updates.compositionScore) {
      updateFields.push('composition_overall = ?');
      params.push(updates.compositionScore.overall);
      updateFields.push('composition_rule_of_thirds = ?');
      params.push(updates.compositionScore.ruleOfThirds);
      updateFields.push('composition_leading_lines = ?');
      params.push(updates.compositionScore.leadingLines);
      updateFields.push('composition_symmetry = ?');
      params.push(updates.compositionScore.symmetry);
      updateFields.push('composition_subject_placement = ?');
      params.push(updates.compositionScore.subjectPlacement);
    }

    if (updates.contentScore) {
      updateFields.push('content_overall = ?');
      params.push(updates.contentScore.overall);
      updateFields.push('content_face_quality = ?');
      params.push(updates.contentScore.faceQuality);
      updateFields.push('content_emotional_sentiment = ?');
      params.push(updates.contentScore.emotionalSentiment);
      updateFields.push('content_interestingness = ?');
      params.push(updates.contentScore.interestingness);
    }

    if (updates.clusterId !== undefined) {
      updateFields.push('cluster_id = ?');
      params.push(updates.clusterId);
    }

    if (updates.syncStatus !== undefined) {
      updateFields.push('sync_status = ?');
      params.push(updates.syncStatus);
    }

    if (updateFields.length === 0) {
      return; // Nothing to update
    }

    // Always update the updated_at timestamp
    updateFields.push('updated_at = ?');
    params.push(Date.now());

    // Add the ID parameter for WHERE clause
    params.push(id);

    const sql = `UPDATE photos SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.dbService.executeSql(sql, params);

    // Update faces if provided
    if (updates.faces) {
      await this.deleteFacesByPhotoId(id);
      await this.insertFaces(id, updates.faces);
    }
  }

  /**
   * Delete photo by ID
   */
  public async delete(id: string): Promise<void> {
    // Faces will be deleted automatically due to CASCADE constraint
    await this.dbService.executeSql('DELETE FROM photos WHERE id = ?', [id]);
  }

  /**
   * Count photos with filter
   */
  public async count(filter: PhotoFilter = {}): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM photos WHERE 1=1';
    const params: any[] = [];

    // Apply same filters as find method
    if (filter.clusterId) {
      sql += ' AND cluster_id = ?';
      params.push(filter.clusterId);
    }

    if (filter.syncStatus) {
      sql += ' AND sync_status = ?';
      params.push(filter.syncStatus);
    }

    if (filter.dateRange) {
      sql += ' AND timestamp BETWEEN ? AND ?';
      params.push(filter.dateRange.start.getTime(), filter.dateRange.end.getTime());
    }

    if (filter.hasFeatures !== undefined) {
      sql += filter.hasFeatures 
        ? ' AND features_embedding IS NOT NULL'
        : ' AND features_embedding IS NULL';
    }

    if (filter.hasFaces !== undefined) {
      const faceCondition = filter.hasFaces 
        ? 'EXISTS (SELECT 1 FROM faces WHERE faces.photo_id = photos.id)'
        : 'NOT EXISTS (SELECT 1 FROM faces WHERE faces.photo_id = photos.id)';
      sql += ` AND ${faceCondition}`;
    }

    if (filter.qualityThreshold !== undefined) {
      sql += ' AND quality_overall >= ?';
      params.push(filter.qualityThreshold);
    }

    const result = await this.dbService.executeSql(sql, params);
    return result[0].count;
  }

  /**
   * Get photos by cluster ID
   */
  public async findByClusterId(clusterId: string): Promise<Photo[]> {
    return this.find({ clusterId });
  }

  /**
   * Get photos by sync status
   */
  public async findBySyncStatus(syncStatus: SyncStatus): Promise<Photo[]> {
    return this.find({ syncStatus });
  }

  /**
   * Batch update sync status
   */
  public async updateSyncStatus(photoIds: string[], syncStatus: SyncStatus): Promise<void> {
    if (photoIds.length === 0) return;

    const placeholders = photoIds.map(() => '?').join(',');
    const sql = `UPDATE photos SET sync_status = ?, updated_at = ? WHERE id IN (${placeholders})`;
    const params = [syncStatus, Date.now(), ...photoIds];

    await this.dbService.executeSql(sql, params);
  }

  /**
   * Insert faces for a photo
   */
  private async insertFaces(photoId: string, faces: Face[]): Promise<void> {
    const sql = `
      INSERT INTO faces (
        id, photo_id, bounding_box_x, bounding_box_y, bounding_box_width, bounding_box_height,
        landmarks, embedding, confidence, age, gender, emotion, smile, eyes_open, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const face of faces) {
      const params = [
        face.id,
        photoId,
        face.boundingBox.x,
        face.boundingBox.y,
        face.boundingBox.width,
        face.boundingBox.height,
        JSON.stringify(face.landmarks),
        JSON.stringify(face.embedding),
        face.confidence,
        face.attributes.age || null,
        face.attributes.gender || null,
        face.attributes.emotion || null,
        face.attributes.smile || null,
        face.attributes.eyesOpen || null,
        Date.now(),
      ];

      await this.dbService.executeSql(sql, params);
    }
  }

  /**
   * Get faces by photo ID
   */
  private async getFacesByPhotoId(photoId: string): Promise<Face[]> {
    const sql = 'SELECT * FROM faces WHERE photo_id = ?';
    const result = await this.dbService.executeSql(sql, [photoId]);

    return result.map(row => ({
      id: row.id,
      boundingBox: {
        x: row.bounding_box_x,
        y: row.bounding_box_y,
        width: row.bounding_box_width,
        height: row.bounding_box_height,
      },
      landmarks: JSON.parse(row.landmarks),
      embedding: JSON.parse(row.embedding),
      confidence: row.confidence,
      attributes: {
        age: row.age,
        gender: row.gender,
        emotion: row.emotion,
        smile: row.smile,
        eyesOpen: row.eyes_open,
      },
    }));
  }

  /**
   * Delete faces by photo ID
   */
  private async deleteFacesByPhotoId(photoId: string): Promise<void> {
    await this.dbService.executeSql('DELETE FROM faces WHERE photo_id = ?', [photoId]);
  }

  /**
   * Map database row to Photo object
   */
  private mapRowToPhoto(row: any): Photo {
    const photo: Photo = {
      id: row.id,
      uri: row.uri,
      metadata: {
        width: row.width,
        height: row.height,
        fileSize: row.file_size,
        format: row.format,
        timestamp: new Date(row.timestamp),
        exif: row.exif_data ? JSON.parse(row.exif_data) : undefined,
        location: row.location_latitude && row.location_longitude ? {
          latitude: row.location_latitude,
          longitude: row.location_longitude,
          altitude: row.location_altitude,
          accuracy: row.location_accuracy,
        } : undefined,
      },
      syncStatus: row.sync_status as SyncStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    // Add features if they exist
    if (row.features_embedding) {
      photo.features = {
        embedding: JSON.parse(row.features_embedding),
        dominantColors: row.dominant_colors ? JSON.parse(row.dominant_colors) : [],
        objects: row.detected_objects ? JSON.parse(row.detected_objects) : [],
        scenes: row.detected_scenes ? JSON.parse(row.detected_scenes) : [],
      };
    }

    // Add quality score if it exists
    if (row.quality_overall !== null) {
      photo.qualityScore = {
        overall: row.quality_overall,
        sharpness: row.quality_sharpness,
        exposure: row.quality_exposure,
        colorBalance: row.quality_color_balance,
        noise: row.quality_noise,
      };
    }

    // Add composition score if it exists
    if (row.composition_overall !== null) {
      photo.compositionScore = {
        overall: row.composition_overall,
        ruleOfThirds: row.composition_rule_of_thirds,
        leadingLines: row.composition_leading_lines,
        symmetry: row.composition_symmetry,
        subjectPlacement: row.composition_subject_placement,
      };
    }

    // Add content score if it exists
    if (row.content_overall !== null) {
      photo.contentScore = {
        overall: row.content_overall,
        faceQuality: row.content_face_quality,
        emotionalSentiment: row.content_emotional_sentiment,
        interestingness: row.content_interestingness,
      };
    }

    // Add cluster ID if it exists
    if (row.cluster_id) {
      photo.clusterId = row.cluster_id;
    }

    return photo;
  }
}

export default PhotoRepository;