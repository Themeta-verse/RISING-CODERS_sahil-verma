import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { EventsCalendarScreen } from '../screens/EventsCalendarScreen';
import { RadarScreen } from '../screens/RadarScreen';
import { HostScreen } from '../screens/HostScreen';
import { SavedScreen } from '../screens/SavedScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { CityPulseScreen } from '../screens/CityPulseScreen';
import { BuddyMatchScreen } from '../screens/BuddyMatchScreen';
import { BuddyMatchRadarScreen } from '../screens/BuddyMatchRadarScreen';
import { EventCircleDetailScreen } from '../screens/EventCircleDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { RootTabParamList, RootStackParamList } from '../types';
import { colors, typography } from '../theme';
import { getSafeBottom, getTabBarHeight } from '../utils/safeDimensions';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Bottom Navigation Tabs: (Events, Calendar, Nearby, Host, Saved)
const MainTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const safeBottom = getSafeBottom(insets.bottom);
  const tabBarHeight = getTabBarHeight(insets.bottom);

  return (
    <Tab.Navigator
      initialRouteName="Discover"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabBarHeight,
            paddingBottom: safeBottom,
          },
        ],
        tabBarActiveTintColor: colors.orangePrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'compass-outline';

          if (route.name === 'Discover') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Nearby') {
            iconName = focused ? 'navigate' : 'navigate-outline';
          } else if (route.name === 'Host') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Saved') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          }

          return (
            <View style={focused ? styles.activeIconContainer : null}>
              <Ionicons
                name={iconName}
                size={route.name === 'Host' ? 26 : 22}
                color={route.name === 'Host' && focused ? colors.orangePrimary : color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarLabel: 'Events' }}
      />
      <Tab.Screen
        name="Calendar"
        component={EventsCalendarScreen}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="Nearby"
        component={RadarScreen}
        options={{ tabBarLabel: 'Nearby' }}
      />
      <Tab.Screen
        name="Host"
        component={HostScreen}
        options={{ tabBarLabel: 'Host' }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{ tabBarLabel: 'Saved' }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animation: 'fade',
          }}
        />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="CityPulse"
            component={CityPulseScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="BuddyMatch"
            component={BuddyMatchScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="BuddyMatchRadar"
            component={BuddyMatchRadarScreen}
            options={{
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="EventCircleDetail"
            component={EventCircleDetailScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Conversations"
            component={ConversationsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(18, 20, 28, 0.98)',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    elevation: 10,
  },
  tabBarLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  activeIconContainer: {
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
});
