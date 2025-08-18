import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';

import {HomeScreen} from '../screens/HomeScreen';
import {LibraryScreen} from '../screens/LibraryScreen';
import {CurationScreen} from '../screens/CurationScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import PhotoImportScreen from '../screens/PhotoImportScreen';

export type RootTabParamList = {
  Home: undefined;
  Library: undefined;
  Curation: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  PhotoDetail: {photoId: string};
  Import: undefined;
  EditPhoto: {photoId: string};
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
        }}
      />
      <Tab.Screen
        name="Curation"
        component={CurationScreen}
        options={{
          tabBarLabel: 'Curation',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen 
        name="Import" 
        component={PhotoImportScreen}
        options={{
          headerShown: true,
          title: 'Import Photos',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
};
