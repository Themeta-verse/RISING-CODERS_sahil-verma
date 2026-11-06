import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Coordinates, HyperlocalEvent, ProjectedSpatialMarker } from '../types';
import { loadMapLibreGL } from '../utils/maplibreLoader';
import { colors, borderRadius } from '../theme';

interface CityPulse3DCanvasProps {
  events: HyperlocalEvent[];
  centerCoordinates: Coordinates;
  centerLocationName?: string;
  selectedEventId: string | null;
  onSelectMarker: (marker: ProjectedSpatialMarker) => void;
  viewportWidth: number;
  viewportHeight: number;
  userCoordinates?: Coordinates;
  isUserDistant?: boolean;
  recenterTrigger?: number;
  zoomLevel?: number;
}

/**
 * Public OpenFreeMap Dark style endpoint.
 * Zero API keys required, completely free and open vector tile style.
 * Powered by OpenStreetMap and OpenMapTiles with global vector coverage.
 */
const OPEN_FREE_MAP_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';

/**
 * Category-specific styling for high-contrast, beautiful discovery pins.
 */
function getCategoryBadge(category: string): { border: string; accent: string; bg: string; icon: string } {
  switch (category) {
    case 'Music':
      return { border: '#EC4899', accent: '#F472B6', bg: 'rgba(236, 72, 153, 0.22)', icon: '🎵' };
    case 'Parties':
      return { border: '#8B5CF6', accent: '#A78BFA', bg: 'rgba(139, 92, 246, 0.22)', icon: '🔥' };
    case 'Comedy':
      return { border: '#F59E0B', accent: '#FBBF24', bg: 'rgba(245, 158, 11, 0.22)', icon: '✨' };
    case 'Workshops':
      return { border: '#3B82F6', accent: '#60A5FA', bg: 'rgba(59, 130, 246, 0.22)', icon: '⚡' };
    case 'Sports':
      return { border: '#10B981', accent: '#34D399', bg: 'rgba(16, 185, 129, 0.22)', icon: '🏆' };
    case 'Meetups':
      return { border: '#06B6D4', accent: '#22D3EE', bg: 'rgba(6, 182, 212, 0.22)', icon: '👥' };
    case 'College':
      return { border: '#F97316', accent: '#FB923C', bg: 'rgba(249, 115, 22, 0.22)', icon: '🎓' };
    default:
      return { border: '#FF6B00', accent: '#FF8833', bg: 'rgba(255, 107, 0, 0.22)', icon: '📍' };
  }
}

/**
 * Computes smart radial offsets for nearby pins to prevent visual overlap
 * while maintaining exact geographic leader line connection.
 */
function computeMarkerOffsets(evs: HyperlocalEvent[]): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  const offsetPatterns = [
    [0, 0],
    [24, -14],
    [-24, -14],
    [26, 14],
    [-26, 14],
    [0, -26],
    [0, 24],
  ];

  for (let i = 0; i < evs.length; i++) {
    let collisionCount = 0;
    const ev = evs[i];
    for (let j = 0; j < i; j++) {
      const prev = evs[j];
      const dLat = Math.abs(ev.coordinates.latitude - prev.coordinates.latitude);
      const dLon = Math.abs(ev.coordinates.longitude - prev.coordinates.longitude);
      if (dLat < 0.00035 && dLon < 0.00035) {
        collisionCount++;
      }
    }
    const pattern = offsetPatterns[collisionCount % offsetPatterns.length];
    result.push(pattern as [number, number]);
  }
  return result;
}

export const CityPulse3DCanvas: React.FC<CityPulse3DCanvasProps> = ({
  events,
  centerCoordinates,
  centerLocationName = 'Bandra & BKC Culture Hub',
  selectedEventId,
  onSelectMarker,
  recenterTrigger = 0,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // Initialize MapLibre GL 3D Map
  useEffect(() => {
    let isCancelled = false;

    loadMapLibreGL().then((maplibregl) => {
      if (!maplibregl || !mapContainerRef.current || isCancelled) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: OPEN_FREE_MAP_DARK_STYLE,
        center: [centerCoordinates.longitude, centerCoordinates.latitude],
        zoom: 12.5, // Broad initial overview showing the Mumbai metropolitan corridor
        pitch: 48, // Natural isometric angle
        bearing: -14, // Coastal perspective
        antialias: true,
        maxPitch: 70,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Add compact attribution at bottom-left
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

      map.on('load', () => {
        if (isCancelled) return;
        setMapLoaded(true);

        // 1. Realistic Directional Sunlight: creates rich volumetric facade shading
        map.setLight({
          anchor: 'viewport',
          color: '#FFFFFF',
          intensity: 0.36,
          position: [1.2, 215, 36],
        });

        // 2. Map Styling & Contrast Refinements:
        // Enhance dark emerald contrast for parks and green spaces
        if (map.getLayer('landuse_park')) {
          try {
            map.setPaintProperty('landuse_park', 'fill-color', '#0E1F16');
            map.setPaintProperty('landuse_park', 'fill-opacity', 0.85);
          } catch {}
        }

        // Deep obsidian-navy water contrast
        if (map.getLayer('water')) {
          try {
            map.setPaintProperty('water', 'fill-color', '#0B1322');
          } catch {}
        }

        // Crisp road network contrast
        if (map.getLayer('highway_major_inner')) {
          try {
            map.setPaintProperty('highway_major_inner', 'line-color', '#222838');
          } catch {}
        }
        if (map.getLayer('highway_major_casing')) {
          try {
            map.setPaintProperty('highway_major_casing', 'line-color', '#121520');
          } catch {}
        }
        if (map.getLayer('highway_minor')) {
          try {
            map.setPaintProperty('highway_minor', 'line-color', '#161A26');
          } catch {}
        }

        // Extend locality / suburb labels so neighborhood names (Bandra, BKC, etc.) stay visible
        if (map.getLayer('place_suburb')) {
          try {
            map.setLayoutProperty('place_suburb', 'maxzoom', 19);
            map.setPaintProperty('place_suburb', 'text-color', '#E2E8F0');
            map.setPaintProperty('place_suburb', 'text-halo-color', '#07080B');
            map.setPaintProperty('place_suburb', 'text-halo-width', 2);
          } catch {}
        }

        // Reduce road label density and scale text with zoom
        if (map.getLayer('highway_name_other')) {
          try {
            map.setLayoutProperty('highway_name_other', 'symbol-spacing', 650);
            map.setLayoutProperty('highway_name_other', 'text-size', [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 8.5,
              16, 10,
              18, 12,
            ]);
            map.setPaintProperty('highway_name_other', 'text-color', 'rgba(125, 132, 150, 0.7)');
            map.setPaintProperty('highway_name_other', 'text-halo-color', '#07080B');
            map.setPaintProperty('highway_name_other', 'text-halo-width', 1.5);
          } catch {}
        }

        // 3. Insert real 3D building extrusions from OpenMapTiles vector source
        // Insert before label layers so road/district labels stay readable on top
        const styleLayers = map.getStyle().layers || [];
        let firstSymbolId: string | undefined;
        for (let i = 0; i < styleLayers.length; i++) {
          if (styleLayers[i].type === 'symbol') {
            firstSymbolId = styleLayers[i].id;
            break;
          }
        }

        if (!map.getLayer('3d-buildings-osm')) {
          map.addLayer(
            {
              id: '3d-buildings-osm',
              type: 'fill-extrusion',
              source: 'openmaptiles',
              'source-layer': 'building',
              minzoom: 14,
              paint: {
                // Restrained, realistic dark architectural tones with facade depth
                'fill-extrusion-color': [
                  'interpolate',
                  ['linear'],
                  ['coalesce', ['get', 'render_height'], 14],
                  0, '#111420',
                  15, '#161B29',
                  35, '#1D2436',
                  65, '#262F46',
                  100, '#303B56',
                ],
                // Height variation based on real OSM heights and floor levels
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  14, 0,
                  14.5,
                  [
                    'case',
                    ['>', ['coalesce', ['get', 'render_height'], 0], 0],
                    ['get', 'render_height'],
                    ['>', ['coalesce', ['to-number', ['get', 'levels']], 0], 0],
                    ['*', ['to-number', ['get', 'levels']], 3.6],
                    14,
                  ],
                ],
                'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                'fill-extrusion-opacity': 0.94,
              },
            },
            firstSymbolId
          );
        }

        // Fade 2D building footprint layer at high zoom so 3D extrusions stand out cleanly
        if (map.getLayer('building')) {
          try {
            map.setPaintProperty('building', 'fill-opacity', [
              'interpolate',
              ['linear'],
              ['zoom'],
              13.5, 0.5,
              14, 0,
            ]);
          } catch {}
        }

        // 4. Add Activity Hotspot Heatmap Layer below 3D buildings
        const heatmapPoints = {
          type: 'FeatureCollection',
          features: events.map((ev) => ({
            type: 'Feature',
            properties: {
              weight: ev.attendeeCount ? Math.min(ev.attendeeCount / 200, 1) : 0.5,
            },
            geometry: {
              type: 'Point',
              coordinates: [ev.coordinates.longitude, ev.coordinates.latitude],
            },
          })),
        };

        if (!map.getSource('activity-hotspots')) {
          map.addSource('activity-hotspots', {
            type: 'geojson',
            data: heatmapPoints,
          });

          map.addLayer(
            {
              id: 'activity-hotspots-layer',
              type: 'heatmap',
              source: 'activity-hotspots',
              paint: {
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': 1.1,
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(0,0,0,0)',
                  0.2, 'rgba(255, 107, 0, 0.12)',
                  0.6, 'rgba(255, 107, 0, 0.35)',
                  1, 'rgba(255, 180, 0, 0.7)',
                ],
                'heatmap-radius': 32,
                'heatmap-opacity': 0.6,
              },
            },
            '3d-buildings-osm'
          );
        }
      });
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center when exploration hub changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    map.flyTo({
      center: [centerCoordinates.longitude, centerCoordinates.latitude],
      zoom: 12.5,
      pitch: is3DMode ? 48 : 0,
      bearing: is3DMode ? -14 : 0,
      duration: 1100,
    });
  }, [centerCoordinates, mapLoaded, is3DMode]);

  // Handle Recenter trigger or Auto-fit
  useEffect(() => {
    if (recenterTrigger > 0 && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      if (events.length > 0 && window.maplibregl) {
        // Fit camera to encompass all active event markers with comfortable UI padding
        const bounds = new window.maplibregl.LngLatBounds();
        events.forEach((ev) => {
          bounds.extend([ev.coordinates.longitude, ev.coordinates.latitude]);
        });
        bounds.extend([centerCoordinates.longitude, centerCoordinates.latitude]);
        map.fitBounds(bounds, {
          padding: { top: 120, bottom: 220, left: 60, right: 60 },
          maxZoom: 14.5,
          pitch: is3DMode ? 48 : 0,
          bearing: is3DMode ? -14 : 0,
          duration: 900,
        });
      } else {
        map.flyTo({
          center: [centerCoordinates.longitude, centerCoordinates.latitude],
          zoom: 12.5,
          pitch: is3DMode ? 48 : 0,
          bearing: is3DMode ? -14 : 0,
          duration: 900,
        });
      }
    }
  }, [recenterTrigger, centerCoordinates, is3DMode, events]);

  // Handle external selectedEventId change (fly camera smoothly to selected event)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded || !selectedEventId) return;

    const targetEvent = events.find((e) => e.id === selectedEventId);
    if (targetEvent) {
      map.flyTo({
        center: [targetEvent.coordinates.longitude, targetEvent.coordinates.latitude],
        zoom: 15.6,
        pitch: is3DMode ? 54 : 0,
        bearing: is3DMode ? -14 : 0,
        duration: 1000,
      });
    }
  }, [selectedEventId, events, mapLoaded, is3DMode]);

  // Synchronize 3D Interactive Event Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined' || !window.maplibregl) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Calculate collision avoidance offsets
    const offsets = computeMarkerOffsets(events);

    // Create fresh markers for all visible events
    events.forEach((ev, idx) => {
      const isSelected = ev.id === selectedEventId;
      const badge = getCategoryBadge(ev.category);
      const [offsetX, offsetY] = offsets[idx];

      const el = document.createElement('div');
      el.className = 'city-pulse-3d-pin';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      el.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.zIndex = isSelected ? '100' : '10';

      // High-contrast, category-differentiated Pin Body
      el.innerHTML = `
        <div style="
          background: ${isSelected ? '#FF6B00' : 'rgba(15, 18, 28, 0.95)'};
          color: ${isSelected ? '#07080B' : '#FFFFFF'};
          border: 1.5px solid ${isSelected ? '#FFFFFF' : badge.border};
          border-radius: 16px;
          padding: 4px 9px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.3px;
          display: flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 4px 14px ${isSelected ? 'rgba(255, 107, 0, 0.65)' : 'rgba(0, 0, 0, 0.8)'};
          transform: scale(${isSelected ? 1.15 : 1});
          backdrop-filter: blur(8px);
        ">
          <span style="font-size: 11px;">${badge.icon}</span>
          <span style="color: ${isSelected ? '#07080B' : badge.accent};">${ev.category}</span>
          ${ev.isFree ? '<span style="color:#10B981;font-size:8px;font-weight:900;background:rgba(16,185,129,0.15);padding:1px 4px;border-radius:4px;">FREE</span>' : ''}
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid ${isSelected ? '#FFFFFF' : badge.border};
          margin-top: -1px;
        "></div>
        <div style="
          width: 6px;
          height: 6px;
          background: ${isSelected ? '#FF6B00' : badge.border};
          border: 1px solid #FFFFFF;
          border-radius: 50%;
          margin-top: 1px;
          box-shadow: 0 0 6px ${badge.border};
        "></div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const markerObj: ProjectedSpatialMarker = {
          eventId: ev.id,
          event: ev,
          coordinates: ev.coordinates,
          cartesian: { x: 0, y: 0 },
          isometric: { isoX: 0, isoY: 0 },
          screen: { screenX: 0, screenY: 0, depth: 0, visible: true },
          distanceKm: ev.distanceKm ?? 1.2,
          isValid: true,
        };
        onSelectMarker(markerObj);

        // Fly 3D camera to selected event with comfortable framing
        map.flyTo({
          center: [ev.coordinates.longitude, ev.coordinates.latitude],
          zoom: 16.4,
          pitch: 58,
          duration: 1000,
        });
      });

      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([ev.coordinates.longitude, ev.coordinates.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Update heatmap source with current filtered events
    const heatmapSource = map.getSource('activity-hotspots');
    if (heatmapSource) {
      heatmapSource.setData({
        type: 'FeatureCollection',
        features: events.map((ev) => ({
          type: 'Feature',
          properties: {
            weight: ev.attendeeCount ? Math.min(ev.attendeeCount / 200, 1) : 0.5,
          },
          geometry: {
            type: 'Point',
            coordinates: [ev.coordinates.longitude, ev.coordinates.latitude],
          },
        })),
      });
    }
  }, [events, selectedEventId, onSelectMarker]);

  const toggle3D = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const nextMode = !is3DMode;
    setIs3DMode(nextMode);
    map.easeTo({
      pitch: nextMode ? 54 : 0,
      bearing: nextMode ? -18 : 0,
      duration: 800,
    });
  }, [is3DMode]);

  return (
    <View style={styles.container}>
      {/* Native WebGL Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: '#07080B',
        }}
      />

      {/* Floating 3D / 2D Camera Toggle Pill */}
      <TouchableOpacity
        style={styles.modeToggleButton}
        onPress={toggle3D}
        activeOpacity={0.8}
      >
        <Ionicons name={is3DMode ? 'cube' : 'map'} size={15} color={colors.orangePrimary} />
        <Text style={styles.modeToggleText}>{is3DMode ? '3D VIEW' : '2D TOP'}</Text>
      </TouchableOpacity>

      {/* Floating Recenter HUD Control */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({
              center: [centerCoordinates.longitude, centerCoordinates.latitude],
              zoom: 12.5,
              pitch: is3DMode ? 48 : 0,
              bearing: is3DMode ? -14 : 0,
              duration: 900,
            });
          }
        }}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="scan-outline" size={17} color={colors.orangePrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#07080B',
  },
  modeToggleButton: {
    position: 'absolute',
    top: 148,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 22, 36, 0.94)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    zIndex: 9000,
    elevation: 8,
  },
  modeToggleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.orangePrimary,
    letterSpacing: 0.5,
  },
  recenterButton: {
    position: 'absolute',
    top: 188,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(16, 22, 36, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9000,
  },
});
