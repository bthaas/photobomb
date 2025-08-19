# AI Photo Curator Backend

A NestJS-based GraphQL API for the AI Photo Curator application, providing user authentication, photo management, and cloud synchronization capabilities.

## 🚀 Features

- **GraphQL API** - Modern, efficient API with type safety
- **User Authentication** - JWT-based authentication system
- **Photo Management** - Store and manage photo metadata and AI analysis results
- **Cloud Sync** - Synchronize data across devices
- **PostgreSQL + pgvector** - Efficient storage with vector similarity search
- **Type Safety** - Full TypeScript support

## 🛠️ Tech Stack

- **NestJS** - Scalable Node.js framework
- **GraphQL** - API query language
- **TypeORM** - Database ORM with TypeScript support
- **PostgreSQL** - Primary database with pgvector extension
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

## 📋 Prerequisites

- Node.js 16+
- PostgreSQL 12+ with pgvector extension
- npm or yarn

## 🚀 Quick Start

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Database Setup

Create a PostgreSQL database and enable the pgvector extension:

\`\`\`sql
CREATE DATABASE photo_curator;
\\c photo_curator;
CREATE EXTENSION IF NOT EXISTS vector;
\`\`\`

### 3. Environment Configuration

Copy the environment template and configure your settings:

\`\`\`bash
cp .env.example .env
\`\`\`

Update the \`.env\` file with your database credentials and JWT secret.

### 4. Start Development Server

\`\`\`bash
npm run start:dev
\`\`\`

The API will be available at:
- **GraphQL Playground**: http://localhost:3000/graphql
- **API Endpoint**: http://localhost:3000/graphql

## 📚 API Documentation

### Authentication

#### Register User
\`\`\`graphql
mutation {
  register(input: {
    email: "user@example.com"
    password: "securepassword"
    firstName: "John"
    lastName: "Doe"
  }) {
    user {
      id
      email
      firstName
      lastName
    }
    token
  }
}
\`\`\`

#### Login
\`\`\`graphql
mutation {
  login(input: {
    email: "user@example.com"
    password: "securepassword"
  }) {
    user {
      id
      email
    }
    token
  }
}
\`\`\`

### User Management

#### Get Current User
\`\`\`graphql
query {
  me {
    id
    email
    firstName
    lastName
    preferences
    createdAt
  }
}
\`\`\`

### Photo Management

#### Get User's Photos
\`\`\`graphql
query {
  myPhotos {
    id
    filename
    width
    height
    overallScore
    technicalScore
    faceCount
    capturedAt
  }
}
\`\`\`

## 🏗️ Architecture

### Database Schema

#### Users Table
- User authentication and profile information
- Preferences stored as JSONB
- Subscription management

#### Photos Table
- Photo metadata and file information
- AI analysis results and scores
- Visual embeddings for similarity search (pgvector)
- User actions (favorites, tags, etc.)

### GraphQL Schema

The API uses a code-first approach with NestJS decorators to generate the GraphQL schema automatically.

## 🔒 Security

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs with salt rounds
- **Input Validation** - class-validator for request validation
- **CORS** - Configured for React Native app

## 🚀 Deployment

### Production Build

\`\`\`bash
npm run build
npm run start:prod
\`\`\`

### Docker Deployment

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
\`\`\`

### Environment Variables

Make sure to set these environment variables in production:

- \`DB_HOST\` - Database host
- \`DB_PORT\` - Database port
- \`DB_USERNAME\` - Database username
- \`DB_PASSWORD\` - Database password
- \`DB_NAME\` - Database name
- \`JWT_SECRET\` - JWT signing secret
- \`NODE_ENV=production\`

## 📈 Future Enhancements

### Phase 2 Features
- **File Upload API** - Direct photo upload to cloud storage
- **Real-time Sync** - WebSocket-based real-time synchronization
- **Advanced Search** - Vector similarity search with pgvector
- **Batch Operations** - Bulk photo operations

### Phase 3 Features
- **Caching Layer** - Redis for improved performance
- **Rate Limiting** - API rate limiting and throttling
- **Analytics** - Usage analytics and metrics
- **Admin Dashboard** - Administrative interface

## 🧪 Testing

\`\`\`bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
\`\`\`

## 📝 License

MIT License - see LICENSE file for details.