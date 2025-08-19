import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import screens (will be created next)
import { ImportScreen } from '../screens/ImportScreen';
import { AnalyzeScreen } from '../screens/AnalyzeScreen';
import { CurateScreen } from '../screens/CurateScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { PhotoDetailScreen } from '../screens/PhotoDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

// Import icons (placeholder for now)
import { TabBarIcon } from '../components/ui/TabBarIcon';

import { RootStackParamList, MainTabParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 88,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Import"
        component={ImportScreen}
        options={{
          tabBarLabel: 'Import',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="photo" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analyze"
        component={AnalyzeScreen}
        options={{
          tabBarLabel: 'Analyze',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="cpu" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Curate"
        component={CurateScreen}
        options={{
          tabBarLabel: 'Curate',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="sparkles" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          tabBarLabel: 'Review',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="check-circle" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#007AFF',
            background: '#000',
            card: '#1a1a1a',
            text: '#fff',
            border: '#333',
            notification: '#FF3B30',
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#000',
              borderBottomColor: '#1a1a1a',
              borderBottomWidth: 1,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 18,
            },
            headerBackTitleVisible: false,
            gestureEnabled: true,
            cardStyle: { backgroundColor: '#000' },
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PhotoDetail"
            component={PhotoDetailScreen}
            options={{
              title: 'Photo Details',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="CurationSession"
            component={CurateScreen} // Will be enhanced for session view
            options={{
              title: 'Curation Session',
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              presentation: 'modal',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};