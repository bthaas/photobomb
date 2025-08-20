# 🚀 AI Photo Curator MVP - Quick Setup Guide

Get your AI Photo Curator MVP running in minutes! This guide walks you through setting up both the backend and frontend.

## 📋 Prerequisites

- **Node.js 16+** installed
- **React Native development environment** configured
- **API key** for either OpenAI (GPT-4V) or Google AI (Gemini Pro Vision)

## 🏃‍♂️ Quick Start

### 1. Backend Setup (5 minutes)

```bash
# Navigate to backend
cd ai-photo-curator-mvp/backend

# Install dependencies (already done if you see node_modules)
npm install

# Configure environment
cp .env.example .env
# Edit .env file with your API keys:
# OPENAI_API_KEY=your_key_here
# AI_PROVIDER=openai

# Start the backend
npm run start:dev
```

✅ **Backend running at**: `http://localhost:3000`

### 2. Frontend Setup (3 minutes)

```bash
# Navigate to frontend
cd ../frontend

# Install dependencies (already done if you see node_modules)  
npm install

# Start Metro bundler
npm start
```

### 3. Run on Device/Emulator

**Android:**
```bash
npm run android
```

**iOS (macOS only):**
```bash
cd ios && pod install && cd ..
npm run ios
```

## 🔑 API Key Setup

### Option A: OpenAI (Recommended)
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set in `.env`: `AI_PROVIDER=openai` and `OPENAI_API_KEY=your_key`

### Option B: Google AI
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)  
2. Set in `.env`: `AI_PROVIDER=google` and `GOOGLE_API_KEY=your_key`

## 📱 How to Use

1. **Launch app** on device/emulator
2. **Tap "Select Photos"** - choose 2-20 photos from gallery
3. **Tap "Find Best Shot"** - AI analyzes and selects the best photo
4. **View result** - Best photo is highlighted with AI reasoning

## 🔧 Troubleshooting

### Backend Issues
- **Port in use**: Change `PORT=3001` in `.env`
- **API errors**: Verify your API key is correct and has credits
- **Dependencies**: Run `npm install` again

### Frontend Issues  
- **Can't connect to backend**: 
  - Android emulator: Change API_BASE_URL to `http://10.0.2.2:3000`
  - iOS simulator: Use `http://localhost:3000`
- **Photo picker not working**: Grant photo permissions on device
- **Metro issues**: Run `npx react-native start --reset-cache`

### Photo Analysis Issues
- **"No photos provided"**: Ensure at least 2 photos are selected
- **"Analysis failed"**: Check backend logs and API key quotas
- **Slow analysis**: Large images take longer (30-60 seconds is normal)

## 🌐 Production Deployment

Ready to deploy? See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- AWS Lambda deployment with Serverless Framework
- Vercel deployment configuration  
- Environment variable setup
- Cost optimization tips

## 💡 Next Steps

Your MVP is ready! Consider these enhancements:
- Add photo filters and editing
- Implement batch processing
- Add user accounts and photo history
- Create custom AI models for specific use cases
- Add social sharing features

## 📞 Need Help?

- Check the individual README files in `backend/` and `frontend/` directories
- Review the deployment guide for production setup
- Verify all prerequisites are installed correctly

---

**🎉 Congratulations!** You now have a working AI Photo Curator MVP that can analyze photos and select the best ones using state-of-the-art vision AI models.