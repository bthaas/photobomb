import React from 'react';
import { View, Text } from 'react-native';

interface TabBarIconProps {
  name: string;
  focused: boolean;
  color: string;
}

// Placeholder icon component
// In a real app, you'd use react-native-vector-icons or similar
export const TabBarIcon: React.FC<TabBarIconProps> = ({ name, focused, color }) => {
  const getIconText = (iconName: string) => {
    switch (iconName) {
      case 'photo':
        return '📷';
      case 'cpu':
        return '🧠';
      case 'sparkles':
        return '✨';
      case 'check-circle':
        return '✅';
      default:
        return '●';
    }
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: focused ? 24 : 20,
          color,
          opacity: focused ? 1 : 0.7,
        }}
      >
        {getIconText(name)}
      </Text>
    </View>
  );
};