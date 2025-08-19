# Photo Curator API Documentation

## GraphQL Schema

### Authentication

#### Register User
```graphql
mutation Register($registerInput: RegisterInput!) {
  register(registerInput: $registerInput) {
    accessToken
    user {
      id
      email
      firstName
      lastName
    }
  }
}
```

**Variables:**
```json
{
  "registerInput": {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Login User
```graphql
mutation Login($loginInput: LoginInput!) {
  login(loginInput: $loginInput) {
    accessToken
    user {
      id
      email
    }
  }
}
```

**Variables:**
```json
{
  "loginInput": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

### User Management

#### Get Current User
```graphql
query Me {
  me {
    id
    email
    firstName
    lastName
    createdAt
  }
}
```

#### Update Profile
```graphql
mutation UpdateProfile($updateUserInput: UpdateUserInput!) {
  updateProfile(updateUserInput: $updateUserInput) {
    id
    firstName
    lastName
  }
}
```

### Photo Management

#### Get Photos
```graphql
query Photos($filter: PhotosFilterInput) {
  photos(filter: $filter) {
    id
    originalFilename
    width
    height
    qualityScore
    compositionScore
    contentScore
    isCurated
    takenAt
    createdAt
  }
}
```

**Filter Options:**
```json
{
  "filter": {
    "isCurated": true,
    "minQualityScore": 0.7,
    "dateFrom": "2024-01-01T00:00:00Z",
    "dateTo": "2024-12-31T23:59:59Z",
    "limit": 50,
    "offset": 0
  }
}
```

#### Get Photo by ID
```graphql
query Photo($id: String!) {
  photo(id: $id) {
    id
    originalFilename
    s3Key
    s3Bucket
    mimeType
    fileSize
    width
    height
    qualityScore
    compositionScore
    contentScore
    detectedObjects
    detectedFaces
    dominantColors
    isCurated
    takenAt
  }
}
```

#### Find Similar Photos
```graphql
query SimilarPhotos($photoId: String!, $limit: Int) {
  similarPhotos(photoId: $photoId, limit: $limit) {
    id
    originalFilename
    qualityScore
  }
}
```

#### Get Photo Statistics
```graphql
query PhotoStats {
  photoStats {
    total
    curated
    analyzed
    synced
  }
}
```

#### Create Photo Record
```graphql
mutation CreatePhoto($createPhotoInput: CreatePhotoInput!) {
  createPhoto(createPhotoInput: $createPhotoInput) {
    id
    originalFilename
    s3Key
  }
}
```

#### Update Photo
```graphql
mutation UpdatePhoto($id: String!, $updatePhotoInput: UpdatePhotoInput!) {
  updatePhoto(id: $id, updatePhotoInput: $updatePhotoInput) {
    id
    isCurated
    curationRank
  }
}
```

#### Mark Photos as Curated
```graphql
mutation MarkPhotosAsCurated($ids: [String!]!) {
  markPhotosAsCurated(ids: $ids)
}
```

#### Delete Photo
```graphql
mutation DeletePhoto($id: String!) {
  deletePhoto(id: $id)
}
```

### Sync Operations

#### Sync Photo Metadata
```graphql
mutation SyncPhotoMetadata($photoId: String!, $metadata: SyncMetadataInput!) {
  syncPhotoMetadata(photoId: $photoId, metadata: $metadata)
}
```

**Metadata Input:**
```json
{
  "metadata": {
    "embedding": [0.1, 0.2, 0.3, ...],
    "qualityScore": 0.85,
    "compositionScore": 0.72,
    "contentScore": 0.91,
    "detectedObjects": [
      {"label": "person", "confidence": 0.95},
      {"label": "dog", "confidence": 0.87}
    ],
    "detectedFaces": [
      {"x": 100, "y": 150, "width": 80, "height": 100}
    ],
    "dominantColors": ["#FF5733", "#33FF57", "#3357FF"]
  }
}
```

#### Batch Sync Metadata
```graphql
mutation BatchSyncMetadata($syncData: BatchSyncInput!) {
  batchSyncMetadata(syncData: $syncData) {
    success
    failed
    errors
  }
}
```

#### Get Sync Status
```graphql
query SyncStatus {
  syncStatus {
    totalPhotos
    syncedPhotos
    pendingPhotos
    lastSyncAt
    syncProgress
  }
}
```

#### Get Curated Photos for Sync
```graphql
query CuratedPhotosForSync {
  curatedPhotosForSync
}
```

## REST Endpoints

### File Upload

#### Direct Photo Upload
```http
POST /upload/photo
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data

file: <photo-file>
metadata: {
  "width": 1920,
  "height": 1080,
  "exifData": {...},
  "location": {...},
  "takenAt": "2024-01-01T12:00:00Z"
}
```

#### Get Presigned Upload URL
```http
POST /upload/presigned-url
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "filename": "photo.jpg",
  "contentType": "image/jpeg"
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/key?signature=...",
  "key": "photos/user-id/unique-filename.jpg",
  "fields": {
    "Content-Type": "image/jpeg",
    "x-amz-acl": "private"
  }
}
```

#### Get Signed Download URL
```http
GET /upload/signed-url/:photoId?expiresIn=3600
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "signedUrl": "https://s3.amazonaws.com/bucket/key?signature=..."
}
```

### Health Check

#### Application Health
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  }
}
```

## Error Handling

### GraphQL Errors
```json
{
  "errors": [
    {
      "message": "Invalid credentials",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens expire after 7 days by default and need to be refreshed by logging in again.

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- File upload endpoints: 10 requests per minute
- General API endpoints: 100 requests per minute

## Data Types

### Photo
```typescript
interface Photo {
  id: string;
  originalFilename: string;
  s3Key: string;
  s3Bucket: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  exifData?: any;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  takenAt?: Date;
  embedding?: string; // JSON string of number array
  qualityScore?: number;
  compositionScore?: number;
  contentScore?: number;
  detectedObjects?: any[];
  detectedFaces?: any[];
  dominantColors?: string[];
  clusterId?: string;
  curationRank?: number;
  isCurated: boolean;
  isDeleted: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```