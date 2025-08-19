# Photo Curator Backend API

A NestJS-based GraphQL API for the AI Photo Curator mobile application, providing user authentication, photo metadata management, and cloud synchronization capabilities.

## Features

- **GraphQL API** with type-safe schema generation
- **JWT Authentication** with secure token management
- **PostgreSQL Database** with pgvector extension for similarity search
- **S3 File Upload** with presigned URLs for secure file handling
- **Photo Metadata Management** with AI analysis result storage
- **Sync Service** for cross-device photo synchronization
- **Vector Similarity Search** for finding similar photos

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **GraphQL** - Query language and runtime
- **TypeORM** - Object-relational mapping
- **PostgreSQL** - Primary database with pgvector extension
- **AWS S3** - File storage service
- **JWT** - JSON Web Token authentication
- **Jest** - Testing framework

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ with pgvector extension
- AWS account with S3 access
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PhotoCurator/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up PostgreSQL with pgvector**
   ```sql
   -- Connect to your PostgreSQL instance
   CREATE DATABASE photo_curator;
   \c photo_curator;
   CREATE EXTENSION vector;
   ```

5. **Run database migrations**
   ```bash
   npm run start:dev
   # Database tables will be created automatically in development
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Database name | `photo_curator` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket name | Required |
| `PORT` | Server port | `3000` |

### Database Setup

The application uses PostgreSQL with the pgvector extension for storing and querying image embeddings:

```sql
-- Install pgvector extension
CREATE EXTENSION vector;

-- Example vector similarity query
SELECT id, (embedding <-> '[0.1,0.2,0.3,...]'::vector) as distance 
FROM photos 
ORDER BY distance ASC 
LIMIT 10;
```

## API Documentation

### GraphQL Playground

When running in development mode, access the GraphQL playground at:
```
http://localhost:3000/graphql
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Key Mutations

**User Registration**
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

**User Login**
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

**Sync Photo Metadata**
```graphql
mutation SyncPhotoMetadata($photoId: String!, $metadata: SyncMetadataInput!) {
  syncPhotoMetadata(photoId: $photoId, metadata: $metadata)
}
```

### Key Queries

**Get User Photos**
```graphql
query Photos($filter: PhotosFilterInput) {
  photos(filter: $filter) {
    id
    originalFilename
    qualityScore
    compositionScore
    contentScore
    isCurated
    takenAt
  }
}
```

**Find Similar Photos**
```graphql
query SimilarPhotos($photoId: String!, $limit: Int) {
  similarPhotos(photoId: $photoId, limit: $limit) {
    id
    originalFilename
    qualityScore
  }
}
```

## File Upload

### Direct Upload
```bash
curl -X POST \
  http://localhost:3000/upload/photo \
  -H 'Authorization: Bearer <token>' \
  -F 'file=@photo.jpg' \
  -F 'metadata={"width":800,"height":600}'
```

### Presigned URL Upload
```graphql
mutation GetPresignedUrl {
  # This would be implemented as a REST endpoint
}
```

## Development

### Running the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

## Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main"]
```

### Environment Setup

1. **Production Database**
   - Set up PostgreSQL with pgvector extension
   - Configure connection pooling
   - Set up database backups

2. **AWS Configuration**
   - Create S3 bucket with appropriate permissions
   - Set up IAM roles for secure access
   - Configure CORS for mobile app access

3. **Security**
   - Use strong JWT secrets
   - Enable HTTPS in production
   - Configure rate limiting
   - Set up monitoring and logging

## API Endpoints

### REST Endpoints

- `POST /upload/photo` - Direct file upload
- `POST /upload/presigned-url` - Get presigned upload URL
- `GET /upload/signed-url/:photoId` - Get signed download URL

### GraphQL Endpoints

- `/graphql` - Main GraphQL endpoint
- Schema available at `/graphql` in development mode

## Performance Considerations

- **Vector Similarity Search**: Uses pgvector for efficient similarity queries
- **File Upload**: Supports both direct upload and presigned URLs
- **Caching**: Implement Redis for session and query caching
- **Database Indexing**: Proper indexes on frequently queried fields
- **Connection Pooling**: Configure TypeORM connection pooling

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Class-validator for request validation
- **SQL Injection Protection**: TypeORM query builder
- **File Upload Security**: MIME type validation and size limits
- **CORS Configuration**: Configurable cross-origin resource sharing

## Monitoring and Logging

- **Health Checks**: Built-in health check endpoints
- **Error Handling**: Global exception filters
- **Request Logging**: Configurable request/response logging
- **Performance Metrics**: Integration with monitoring services

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.