import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';

import { AppNavigator } from './src/navigation/AppNavigator';
import { aiService } from './src/services/ai/AIService';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize AI service on app start
    const initializeServices = async () => {
      try {
        await aiService.initialize();
        console.log('AI services initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AI services:', error);
      }
    };

    initializeServices();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <AppNavigator />
    </>
  );
};

export default App;