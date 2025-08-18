# AI Photo Curator

An intelligent mobile application that automatically organizes, curates, and enhances users' photo collections using on-device machine learning.

## Features

- **Smart Photo Organization**: Automatically groups photos by events, people, and visual similarity
- **AI-Powered Curation**: Identifies the best shots from your photo library
- **Face Recognition**: Groups photos by people with on-device processing
- **Photo Enhancement**: AI-powered editing tools for background removal and enhancement
- **Privacy-First**: All AI processing happens on your device
- **Cloud Sync**: Optional synchronization across devices

## Tech Stack

- **React Native** with TypeScript
- **TensorFlow.js** for on-device ML
- **React Navigation** for navigation
- **Zustand** for state management
- **React Native Reanimated** for animations

## Getting Started

### Prerequisites

- Node.js (>= 16)
- React Native development environment
- iOS Simulator or Android Emulator

### Installation

1. Install dependencies:

```bash
npm install
```

2. Install iOS dependencies (iOS only):

```bash
cd ios && pod install
```

3. Start the Metro bundler:

```bash
npm start
```

4. Run the app:

```bash
# iOS
npm run ios

# Android
npm run android
```

## Development

### Scripts

- `npm start` - Start Metro bundler
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigation/     # Navigation configuration
├── services/       # Business logic and API services
├── stores/         # Zustand state management
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
└── test/           # Test utilities and setup
```

## License

MIT
