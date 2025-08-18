import React, { useEffect } from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native';

import {AppNavigator} from './navigation/AppNavigator';
import { AIService } from './services/ai';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize AI service when app starts
    const initializeAI = async () => {
      try {
        const aiService = AIService.getInstance();
        await aiService.initialize();
        console.log('AI Service initialized successfully');
        
        // Optionally preload essential models
        await aiService.preloadEssentialModels();
        console.log('Essential AI models preloaded');
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        // App can still function without AI features
      }
    };

    initializeAI();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
