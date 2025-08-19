-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for vector similarity search
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_embedding_idx 
ON photos USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create additional indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_user_id_idx ON photos(userId);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_taken_at_idx ON photos(takenAt);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_quality_score_idx ON photos(qualityScore);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_is_curated_idx ON photos(isCurated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_sync_status_idx ON photos(syncStatus);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_cluster_id_idx ON photos(clusterId);

-- Create composite indexes for common filter combinations
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_user_curated_idx ON photos(userId, isCurated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_user_deleted_idx ON photos(userId, isDeleted);
CREATE INDEX CONCURRENTLY IF NOT EXISTS photos_user_sync_idx ON photos(userId, syncStatus);