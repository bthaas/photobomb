# AI Photo Curator - Frontend

React Native mobile app for the AI Photo Curator MVP. This app allows users to select multiple photos from their device and get AI-powered analysis to find the single best shot.

## Features

- **Multi-photo selection** - Choose up to 20 photos from device gallery
- **Clean, minimalist UI** - Focus entirely on photos and results
- **Real-time analysis** - See AI processing with loading states
- **Result display** - Prominently highlight the AI-selected best photo
- **Cross-platform** - Works on both iOS and Android

## Prerequisites

- Node.js 16+
- React Native development environment set up
- iOS Simulator (macOS) or Android Emulator
- AI Photo Curator backend running

## Setup

### Install Dependencies

```bash
npm install
```

### Platform Setup

#### Android
- Make sure you have Android Studio installed
- Create an Android Virtual Device (AVD)
- Start the emulator

#### iOS (macOS only)
```bash
cd ios && pod install && cd ..
```

## Running the App

### Start Metro Bundler
```bash
npm start
```

### Run on Android
```bash
npm run android
```

### Run on iOS
```bash
npm run ios
```

## Configuration

### Backend URL

Update the `API_BASE_URL` in `src/services/api.ts` to point to your backend:

```typescript
// For local development
const API_BASE_URL = 'http://localhost:3000';

// For Android emulator accessing host machine
const API_BASE_URL = 'http://10.0.2.2:3000';

// For production
const API_BASE_URL = 'https://your-backend-url.com';
```

## User Flow

1. **Select Photos** - Tap "Select Photos" to choose multiple images from gallery
2. **Analyze** - Tap "Find Best Shot" to send photos to AI for analysis
3. **View Result** - The best photo is highlighted with reasoning from AI
4. **Reset/New Analysis** - Select new photos or analyze again

## Technology Stack

- **React Native** - Cross-platform mobile framework
- **TypeScript** - Type safety and better development experience
- **react-native-image-picker** - Photo selection from device gallery
- **Axios** - HTTP client for API communication

## Project Structure

```
src/
├── components/         # Reusable UI components
│   └── PhotoGrid.tsx  # Grid display for photos
├── screens/           # Main app screens  
│   └── HomeScreen.tsx # Primary photo selection and analysis screen
├── services/          # External service integrations
│   └── api.ts        # Backend API communication
├── types/            # TypeScript type definitions
│   └── index.ts      # Shared types
└── App.tsx           # Main app component
```

## Troubleshooting

### Android Network Issues
If you can't connect to the backend on Android emulator, try:
- Use `http://10.0.2.2:3000` instead of `localhost:3000`
- Check that the backend is running
- Verify network permissions in AndroidManifest.xml

### Photo Permissions
Make sure photo library permissions are granted on the device/emulator.

### Metro Bundle Issues
Try clearing the cache:
```bash
npx react-native start --reset-cache
```