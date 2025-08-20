# AI Photo Curator - MVP

This is a simplified MVP implementation of the AI Photo Curator that allows users to upload a group of photos and have AI select the single best one.

## Technology Stack

- **Frontend**: React Native with TypeScript
- **Backend**: NestJS with TypeScript
- **AI**: Cloud Vision LLM (GPT-4V or Gemini Pro Vision)
- **Deployment**: Serverless functions

## Project Structure

```
ai-photo-curator-mvp/
├── frontend/          # React Native mobile app
└── backend/           # NestJS serverless backend
```

## Core Features

1. **Photo Selection**: Multi-photo selection from device gallery
2. **AI Analysis**: Cloud-based photo quality analysis
3. **Best Shot Display**: Prominently display the AI-selected best photo

## 🚀 Quick Start

**Ready to run in 5 minutes!** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.

```bash
# 1. Setup backend
cd backend && cp .env.example .env
# Edit .env with your OpenAI or Google AI API key
npm run start:dev

# 2. Setup frontend (new terminal)
cd ../frontend && npm start
npm run android  # or npm run ios
```

## 📁 Project Structure

```
ai-photo-curator-mvp/
├── backend/           # NestJS serverless backend
│   ├── src/
│   │   ├── ai/       # AI service integration
│   │   ├── photo/    # Photo upload & analysis endpoints
│   │   ├── main.ts   # Development server entry
│   │   ├── lambda.ts # AWS Lambda entry
│   │   └── vercel.ts # Vercel deployment entry
│   ├── serverless.yml # AWS deployment config
│   └── vercel.json   # Vercel deployment config
├── frontend/          # React Native mobile app
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── screens/   # App screens
│   │   ├── services/  # API integration
│   │   └── types/     # TypeScript definitions
│   ├── android/       # Android configuration
│   └── ios/          # iOS configuration
├── SETUP_GUIDE.md    # Quick setup instructions
└── DEPLOYMENT.md     # Production deployment guide
```

## 📖 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to AWS or Vercel
- **[backend/README.md](backend/README.md)** - Backend API documentation
- **[frontend/README.md](frontend/README.md)** - Frontend setup and configuration