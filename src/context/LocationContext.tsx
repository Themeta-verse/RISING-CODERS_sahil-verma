import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinates } from '../types';
import { DEFAULT_USER_COORDINATES } from '../data/mockEvents';

export interface DiscoveryArea {
  id: string;
  name: string;
  coordinates: Coordinates;
  tag: string;
}

export const DISCOVERY_AREAS: DiscoveryArea[] = [
  {
    id: 'indiranagar',
    name: 'Indiranagar Arts Hub',
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
    tag: 'Culture & Nightlife',
  },
  {
    id: 'koramangala',
    name: 'Koramangala Tech Quarter',
    coordinates: { latitude: 12.9352, longitude: 77.6245 },
    tag: 'Startups & Hackathons',
  },
  {
    id: 'whitefield',
    name: 'Whitefield Tech Cluster',
    coordinates: { latitude: 12.9698, longitude: 77.7499 },
    tag: 'Innovation Labs',
  },
  {
    id: 'north_quarter',
    name: 'North Innovation Corridor',
    coordinates: { latitude: 13.0358, longitude: 77.597 },
    tag: 'Campuses & Design',
  },
];

const STORAGE_KEY_AREA = '@social_buddy_preferred_area';

interface LocationContextType {
  userCoordinates: Coordinates;
  locationName: string;
  selectedAreaId: string;
  permissionStatus: 'granted' | 'denied' | 'fallback' | 'checking';
  isUsingFallback: boolean;
  discoveryAreas: DiscoveryArea[];
  setDiscoveryArea: (areaId: string) => Promise<void>;
  setDemoLocation: (locationId: string) => void;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userCoordinates, setUserCoordinates] = useState<Coordinates>(DEFAULT_USER_COORDINATES);
  const [locationName, setLocationName] = useState<string>('Indiranagar Arts Hub');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('indiranagar');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'fallback' | 'checking'>('checking');
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(true);

  // Restore preferred area on boot
  useEffect(() => {
    const restoreArea = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_AREA);
        if (stored && stored !== 'gps') {
          const area = DISCOVERY_AREAS.find((a) => a.id === stored);
          if (area) {
            setSelectedAreaId(area.id);
            setUserCoordinates(area.coordinates);
            setLocationName(area.name);
            setIsUsingFallback(true);
            setPermissionStatus('fallback');
            return;
          }
        }
        // Default: attempt GPS location fetch
        requestAndFetchLocation();
      } catch {
        requestAndFetchLocation();
      }
    };
    restoreArea();
  }, []);

  const requestAndFetchLocation = useCallback(async () => {
    setPermissionStatus('checking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionStatus('denied');
        setIsUsingFallback(true);
        const defaultArea = DISCOVERY_AREAS[0];
        setUserCoordinates(defaultArea.coordinates);
        setLocationName(defaultArea.name);
        setSelectedAreaId(defaultArea.id);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setUserCoordinates(coords);
      setPermissionStatus('granted');
      setIsUsingFallback(false);
      setSelectedAreaId('gps');

      // Try reverse geocoding to get neighborhood / city
      try {
        const reverse = await Location.reverseGeocodeAsync(coords);
        if (reverse && reverse.length > 0) {
          const place = reverse[0];
          const name =
            place.district ||
            place.subregion ||
            place.city ||
            place.street ||
            'Current Location';
          setLocationName(name);
        }
      } catch {
        setLocationName('Current Location (GPS)');
      }
    } catch {
      // Fallback on simulator / missing GPS
      setPermissionStatus('fallback');
      setIsUsingFallback(true);
      const defaultArea = DISCOVERY_AREAS[0];
      setUserCoordinates(defaultArea.coordinates);
      setLocationName(defaultArea.name);
      setSelectedAreaId(defaultArea.id);
    }
  }, []);

  const setDiscoveryArea = async (areaId: string) => {
    if (areaId === 'gps') {
      await AsyncStorage.setItem(STORAGE_KEY_AREA, 'gps');
      await requestAndFetchLocation();
      return;
    }

    const area = DISCOVERY_AREAS.find((a) => a.id === areaId);
    if (area) {
      setSelectedAreaId(area.id);
      setUserCoordinates(area.coordinates);
      setLocationName(area.name);
      setIsUsingFallback(true);
      setPermissionStatus('fallback');
      await AsyncStorage.setItem(STORAGE_KEY_AREA, area.id);
    }
  };

  const setDemoLocation = (locationId: string) => {
    setDiscoveryArea(locationId);
  };

  return (
    <LocationContext.Provider
      value={{
        userCoordinates,
        locationName,
        selectedAreaId,
        permissionStatus,
        isUsingFallback,
        discoveryAreas: DISCOVERY_AREAS,
        setDiscoveryArea,
        setDemoLocation,
        refreshLocation: requestAndFetchLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
