/**
 * Core database service using SQLite for local data storage
 */

import SQLite, { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';

// Enable debugging in development
if (__DEV__) {
  SQLite.DEBUG(true);
  SQLite.enablePromise(true);
}

export interface DatabaseConfig {
  name: string;
  version: string;
  displayName: string;
  size: number;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private database: SQLiteDatabase | null = null;
  private isInitialized = false;

  private readonly config: DatabaseConfig = {
    name: 'PhotoCurator.db',
    version: '1.0',
    displayName: 'Photo Curator Database',
    size: 200000, // 200MB
  };

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database connection and create tables
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.database) {
      return;
    }

    try {
      this.database = await SQLite.openDatabase(this.config);
      await this.createTables();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Get the database instance
   */
  public getDatabase(): SQLiteDatabase {
    if (!this.database || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  /**
   * Execute a transaction
   */
  public async executeTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const db = this.getDatabase();
    
    return new Promise((resolve, reject) => {
      db.transaction(
        async (tx) => {
          try {
            const result = await callback(tx);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          console.error('Transaction failed:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Execute a SQL query
   */
  public async executeSql(
    sql: string,
    params: any[] = []
  ): Promise<any[]> {
    const db = this.getDatabase();
    
    return new Promise((resolve, reject) => {
      db.executeSql(
        sql,
        params,
        (result) => {
          const rows: any[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            rows.push(result.rows.item(i));
          }
          resolve(rows);
        },
        (error) => {
          console.error('SQL execution failed:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * Create all database tables
   */
  private async createTables(): Promise<void> {
    const createTableQueries = [
      // Photos table
      `CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        uri TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        file_size INTEGER NOT NULL,
        format TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        exif_data TEXT,
        location_latitude REAL,
        location_longitude REAL,
        location_altitude REAL,
        location_accuracy REAL,
        features_embedding TEXT,
        dominant_colors TEXT,
        detected_objects TEXT,
        detected_scenes TEXT,
        quality_overall REAL,
        quality_sharpness REAL,
        quality_exposure REAL,
        quality_color_balance REAL,
        quality_noise REAL,
        composition_overall REAL,
        composition_rule_of_thirds REAL,
        composition_leading_lines REAL,
        composition_symmetry REAL,
        composition_subject_placement REAL,
        content_overall REAL,
        content_face_quality REAL,
        content_emotional_sentiment REAL,
        content_interestingness REAL,
        cluster_id TEXT,
        sync_status TEXT NOT NULL DEFAULT 'local_only',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (cluster_id) REFERENCES clusters (id)
      )`,

      // Faces table
      `CREATE TABLE IF NOT EXISTS faces (
        id TEXT PRIMARY KEY,
        photo_id TEXT NOT NULL,
        bounding_box_x REAL NOT NULL,
        bounding_box_y REAL NOT NULL,
        bounding_box_width REAL NOT NULL,
        bounding_box_height REAL NOT NULL,
        landmarks TEXT,
        embedding TEXT NOT NULL,
        confidence REAL NOT NULL,
        age INTEGER,
        gender TEXT,
        emotion TEXT,
        smile REAL,
        eyes_open REAL,
        person_cluster_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
        FOREIGN KEY (person_cluster_id) REFERENCES person_clusters (id)
      )`,

      // Clusters table
      `CREATE TABLE IF NOT EXISTS clusters (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        centroid TEXT NOT NULL,
        confidence REAL NOT NULL,
        label TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      // Person clusters table
      `CREATE TABLE IF NOT EXISTS person_clusters (
        id TEXT PRIMARY KEY,
        name TEXT,
        confidence REAL NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      // Event clusters table
      `CREATE TABLE IF NOT EXISTS event_clusters (
        id TEXT PRIMARY KEY,
        name TEXT,
        time_range_start INTEGER NOT NULL,
        time_range_end INTEGER NOT NULL,
        location_latitude REAL,
        location_longitude REAL,
        confidence REAL NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      // Photo edits table
      `CREATE TABLE IF NOT EXISTS photo_edits (
        id TEXT PRIMARY KEY,
        photo_id TEXT NOT NULL,
        edit_type TEXT NOT NULL,
        parameters TEXT NOT NULL,
        result_uri TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
      )`,

      // Cache metadata table
      `CREATE TABLE IF NOT EXISTS cache_metadata (
        key TEXT PRIMARY KEY,
        size INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        last_accessed INTEGER NOT NULL,
        expires_at INTEGER
      )`,

      // Database metadata table
      `CREATE TABLE IF NOT EXISTS database_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    ];

    // Create indexes for better query performance
    const createIndexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos (timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_photos_cluster_id ON photos (cluster_id)',
      'CREATE INDEX IF NOT EXISTS idx_photos_sync_status ON photos (sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_photos_location ON photos (location_latitude, location_longitude)',
      'CREATE INDEX IF NOT EXISTS idx_faces_photo_id ON faces (photo_id)',
      'CREATE INDEX IF NOT EXISTS idx_faces_person_cluster_id ON faces (person_cluster_id)',
      'CREATE INDEX IF NOT EXISTS idx_clusters_type ON clusters (type)',
      'CREATE INDEX IF NOT EXISTS idx_photo_edits_photo_id ON photo_edits (photo_id)',
      'CREATE INDEX IF NOT EXISTS idx_cache_metadata_expires_at ON cache_metadata (expires_at)',
    ];

    try {
      // Execute table creation queries
      for (const query of createTableQueries) {
        await this.executeSql(query);
      }

      // Execute index creation queries
      for (const query of createIndexQueries) {
        await this.executeSql(query);
      }

      // Initialize database metadata
      await this.initializeMetadata();

      console.log('Database tables and indexes created successfully');
    } catch (error) {
      console.error('Failed to create database tables:', error);
      throw error;
    }
  }

  /**
   * Initialize database metadata
   */
  private async initializeMetadata(): Promise<void> {
    const metadata = [
      { key: 'version', value: this.config.version },
      { key: 'created_at', value: Date.now().toString() },
      { key: 'last_migration', value: '0' },
    ];

    for (const item of metadata) {
      await this.executeSql(
        'INSERT OR REPLACE INTO database_metadata (key, value, updated_at) VALUES (?, ?, ?)',
        [item.key, item.value, Date.now()]
      );
    }
  }

  /**
   * Get database metadata
   */
  public async getMetadata(key: string): Promise<string | null> {
    const result = await this.executeSql(
      'SELECT value FROM database_metadata WHERE key = ?',
      [key]
    );
    return result.length > 0 ? result[0].value : null;
  }

  /**
   * Set database metadata
   */
  public async setMetadata(key: string, value: string): Promise<void> {
    await this.executeSql(
      'INSERT OR REPLACE INTO database_metadata (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, Date.now()]
    );
  }

  /**
   * Get database statistics
   */
  public async getStatistics(): Promise<{
    totalPhotos: number;
    totalClusters: number;
    totalFaces: number;
    databaseSize: number;
  }> {
    const [photoCount] = await this.executeSql('SELECT COUNT(*) as count FROM photos');
    const [clusterCount] = await this.executeSql('SELECT COUNT(*) as count FROM clusters');
    const [faceCount] = await this.executeSql('SELECT COUNT(*) as count FROM faces');
    
    // Get database file size (approximate)
    const [sizeResult] = await this.executeSql('PRAGMA page_count');
    const [pageSizeResult] = await this.executeSql('PRAGMA page_size');
    const databaseSize = (sizeResult.page_count || 0) * (pageSizeResult.page_size || 0);

    return {
      totalPhotos: photoCount.count,
      totalClusters: clusterCount.count,
      totalFaces: faceCount.count,
      databaseSize,
    };
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
      this.isInitialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Delete the database file (for testing or reset)
   */
  public async deleteDatabase(): Promise<void> {
    try {
      await this.close();
      await SQLite.deleteDatabase(this.config);
      console.log('Database deleted successfully');
    } catch (error) {
      console.error('Failed to delete database:', error);
      throw error;
    }
  }
}

export default DatabaseService;