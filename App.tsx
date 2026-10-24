import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { LocationProvider } from './src/context/LocationContext';
import { EventsProvider } from './src/context/EventsContext';
import { colors } from './src/theme';

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
    <SafeAreaProvider>
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
