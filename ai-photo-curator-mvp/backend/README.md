# AI Photo Curator - Backend

NestJS backend service for the AI Photo Curator MVP. This service handles photo uploads and integrates with cloud vision LLMs (OpenAI GPT-4V or Google Gemini Pro Vision) to analyze and select the best photo from a group.

## Features

- **Multi-photo upload** - Accept up to 20 photos per request
- **Cloud AI integration** - Support for both OpenAI GPT-4V and Google Gemini Pro Vision
- **Photo analysis** - AI-powered selection of the best photo based on technical and aesthetic quality
- **RESTful API** - Simple endpoints for photo analysis
- **CORS enabled** - Ready for frontend integration

## Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- API keys for either OpenAI or Google AI

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
# Set AI_PROVIDER to either 'openai' or 'google'
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# API Keys (choose one)
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# AI Provider ('openai' or 'google')
AI_PROVIDER=openai
```

## Running the Application

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## API Endpoints

### POST /photo/analyze

Analyzes a group of photos and returns the index of the best one.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with 'photos' field containing 2-20 image files

**Response:**
```json
{
  "success": true,
  "bestPhotoIndex": 2,
  "reasoning": "This photo has the best lighting and composition...",
  "totalPhotos": 5,
  "selectedPhoto": {
    "originalName": "IMG_001.jpg",
    "size": 2048576,
    "mimeType": "image/jpeg"
  }
}
```

### POST /photo/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "AI Photo Curator backend is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Deployment

This backend is designed to be deployed as a serverless function. Configuration examples for AWS Lambda and Vercel will be added in future updates.

## Technology Stack

- **NestJS** - Backend framework
- **TypeScript** - Type safety
- **Multer** - File upload handling
- **OpenAI API** - GPT-4 Vision analysis
- **Google Generative AI** - Gemini Pro Vision analysis