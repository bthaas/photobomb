# AI Photo Curator MVP - Deployment Guide

This guide covers deploying the AI Photo Curator MVP backend to serverless platforms.

## Prerequisites

- Built and tested backend locally
- API keys for OpenAI or Google AI
- Cloud platform account (AWS or Vercel)

## Option 1: AWS Lambda (Serverless Framework)

### Setup

1. Install AWS CLI and configure credentials:
```bash
aws configure
```

2. Install Serverless Framework globally:
```bash
npm install -g serverless
```

3. Set environment variables:
```bash
export OPENAI_API_KEY="your_openai_key"
export GOOGLE_API_KEY="your_google_key"  
export AI_PROVIDER="openai"  # or "google"
```

### Deploy

```bash
cd backend
npm run deploy:aws
```

### Custom Stage/Region

```bash
cd backend
npm run build
serverless deploy --stage prod --region us-west-2
```

## Option 2: Vercel

### Setup

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Set environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`
   - `AI_PROVIDER`

### Deploy

```bash
cd backend
npm run deploy:vercel
```

Or use automatic GitHub integration by connecting your repository to Vercel.

## Environment Variables

Both platforms require these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4V | `sk-...` |
| `GOOGLE_API_KEY` | Google AI API key for Gemini | `AIza...` |
| `AI_PROVIDER` | Which AI service to use | `openai` or `google` |

## Testing Deployment

After deployment, test the health endpoint:

```bash
curl -X POST https://your-deployed-url/photo/health
```

Expected response:
```json
{
  "success": true,
  "message": "AI Photo Curator backend is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Frontend Configuration

Update the frontend API URL in `frontend/src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://your-deployed-url';
```

## Cost Considerations

### AWS Lambda
- **Free tier**: 1M requests + 400,000 GB-seconds per month
- **Paid**: ~$0.20 per 1M requests + compute time
- **Image processing**: ~$0.01-0.05 per analysis (depending on image sizes)

### Vercel
- **Hobby**: 100GB-hours + 1,000 serverless function invocations per month
- **Pro**: $20/month + usage-based pricing
- **Image processing**: Similar compute costs to AWS

### AI API Costs
- **OpenAI GPT-4V**: ~$0.01-0.03 per image analysis
- **Google Gemini Pro Vision**: ~$0.005-0.015 per image analysis

## Monitoring

### AWS
- CloudWatch logs automatically available
- Set up CloudWatch alarms for errors

### Vercel  
- Built-in function logs and analytics
- Real-time error tracking

## Security

- API keys stored securely in platform environment variables
- CORS configured for frontend domain only in production
- File upload limits (10MB per file, 20 files max)
- Input validation for all endpoints

## Scaling

Both platforms auto-scale based on demand:
- **Cold starts**: 1-3 seconds for first request
- **Warm requests**: ~100-500ms response time
- **Concurrent limit**: Adjust based on AI API rate limits