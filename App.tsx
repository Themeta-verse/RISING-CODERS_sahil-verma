import React from 'react';
import { Text, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { EventsProvider } from './src/context/EventsContext';
import { colors } from './src/theme';

// Enforce consistent typography & scale across all Android devices (Samsung, Xiaomi, OnePlus, Vivo, etc.)
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.allowFontScaling = false;
(Text as any).defaultProps.maxFontSizeMultiplier = 1.0;

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.allowFontScaling = false;
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.0;

const appNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surfacePrimary,
    text: colors.textPrimary,
    border: colors.borderSubtle,
    primary: colors.orangePrimary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AuthProvider>
        <LocationProvider>
          <EventsProvider>
            <NavigationContainer theme={appNavigationTheme}>
              <RootNavigator />
              <StatusBar style="light" />
            </NavigationContainer>
          </EventsProvider>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
