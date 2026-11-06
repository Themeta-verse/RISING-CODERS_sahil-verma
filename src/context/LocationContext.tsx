import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinates, LocationProvenance } from '../types';
import { DEFAULT_USER_COORDINATES } from '../data/mockEvents';

export interface DiscoveryArea {
  id: string;
  name: string;
  coordinates: Coordinates;
  tag: string;
}

export const DISCOVERY_AREAS: DiscoveryArea[] = [
  {
    id: 'mumbai_bandra',
    name: 'Bandra & BKC Culture Hub',
    coordinates: { latitude: 19.0596, longitude: 72.8295 },
    tag: 'Culture & Tech',
  },
  {
    id: 'mumbai_south',
    name: 'South Mumbai Heritage',
    coordinates: { latitude: 18.9220, longitude: 72.8347 },
    tag: 'Arts & Architecture',
  },
  {
    id: 'mumbai_suburbs',
    name: 'Andheri & Juhu Creative Quarter',
    coordinates: { latitude: 19.1136, longitude: 72.8697 },
    tag: 'Entertainment & Studios',
  },
  {
    id: 'thane',
    name: 'Thane Lake City Hub',
    coordinates: { latitude: 19.2183, longitude: 72.9781 },
    tag: 'Lakes & Communities',
  },
  {
    id: 'navi_mumbai',
    name: 'Navi Mumbai Waterfront',
    coordinates: { latitude: 19.0330, longitude: 73.0297 },
    tag: 'Sports & Parks',
  },
  {
    id: 'pune',
    name: 'Pune Koregaon & IT Hub',
    coordinates: { latitude: 18.5365, longitude: 73.8942 },
    tag: 'Live Music & Hackathons',
  },
  {
    id: 'nashik',
    name: 'Nashik Valley & Hills',
    coordinates: { latitude: 20.0055, longitude: 73.6885 },
    tag: 'Vineyards & Treks',
  },
  {
    id: 'nagpur',
    name: 'Nagpur Central Hub',
    coordinates: { latitude: 21.1458, longitude: 79.0882 },
    tag: 'Campus & Lakes',
  },
];

const STORAGE_KEY_AREA = '@social_buddy_preferred_area';

interface LocationContextType {
  userCoordinates: Coordinates;
  locationName: string;
  selectedAreaId: string;
  permissionStatus: 'granted' | 'denied' | 'fallback' | 'checking';
  isUsingFallback: boolean;
  locationProvenance: LocationProvenance;
  discoveryAreas: DiscoveryArea[];
  setDiscoveryArea: (areaId: string) => Promise<void>;
  setDemoLocation: (locationId: string) => void;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userCoordinates, setUserCoordinates] = useState<Coordinates>(DEFAULT_USER_COORDINATES);
  const [locationName, setLocationName] = useState<string>('Bandra & BKC Culture Hub');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('mumbai_bandra');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'fallback' | 'checking'>('checking');
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(true);
  const [locationProvenance, setLocationProvenance] = useState<LocationProvenance>('fallback_demo');

  const requestAndFetchLocation = useCallback(async () => {
    setPermissionStatus('checking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionStatus('denied');
        setIsUsingFallback(true);
        setLocationProvenance('fallback_demo');
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
      setLocationProvenance('gps');

      // Try reverse geocoding to get neighborhood / city
      try {
        const reverse = await Location.reverseGeocodeAsync(coords);
        if (reverse && reverse.length > 0) {
          const place = reverse[0];
          const name =
            place.city ||
            place.district ||
            place.subregion ||
            place.street ||
            'Current Location';
          setLocationName(name);
        } else {
          if (
            coords.latitude >= 18.5 &&
            coords.latitude <= 19.5 &&
            coords.longitude >= 72.5 &&
            coords.longitude <= 73.3
          ) {
            setLocationName('Mumbai');
          } else {
            setLocationName('Current Location (GPS)');
          }
        }
      } catch {
        if (
          coords.latitude >= 18.5 &&
          coords.latitude <= 19.5 &&
          coords.longitude >= 72.5 &&
          coords.longitude <= 73.3
        ) {
          setLocationName('Mumbai');
        } else {
          setLocationName('Current Location (GPS)');
        }
      }
    } catch {
      // Fallback on simulator / missing GPS
      setPermissionStatus('fallback');
      setIsUsingFallback(true);
      setLocationProvenance('fallback_demo');
      const defaultArea = DISCOVERY_AREAS[0];
      setUserCoordinates(defaultArea.coordinates);
      setLocationName(defaultArea.name);
      setSelectedAreaId(defaultArea.id);
    }
  }, []);

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
            setLocationProvenance('discovery_hub');
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
  }, [requestAndFetchLocation]);

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
      setLocationProvenance('discovery_hub');
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
        locationProvenance,
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
