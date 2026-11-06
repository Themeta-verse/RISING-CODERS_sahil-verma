import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Coordinates,
  HyperlocalEvent,
  ProjectedSpatialMarker,
  CityPulseViewportConfig,
} from '../types';
import {
  batchProjectEvents,
  getOptimalScale,
  cartesianToIsometric,
  isometricToScreen,
} from '../utils/projection';
import { CityPulseMarker } from './CityPulseMarker';
import { colors, borderRadius } from '../theme';

interface CityPulseCanvasProps {
  events: HyperlocalEvent[];
  centerCoordinates: Coordinates;
  centerLocationName?: string;
  selectedEventId: string | null;
  onSelectMarker: (marker: ProjectedSpatialMarker) => void;
  viewportWidth: number;
  viewportHeight: number;
  userCoordinates?: Coordinates;
  isUserDistant?: boolean;
  onRecenter?: () => void;
  recenterTrigger?: number;
  zoomLevel?: number;
}

// Procedural stylized isometric buildings around the hub core
interface CityBuildingDef {
  id: string;
  cartX: number; // km relative to center
  cartY: number; // km relative to center
  width: number;
  length: number;
  height: number;
  label?: string;
  isAccent?: boolean;
}

const PROCEDURAL_BUILDINGS: CityBuildingDef[] = [
  { id: 'bld-hub-1', cartX: -0.6, cartY: 0.8, width: 22, length: 22, height: 42, label: 'Tech Tower' },
  { id: 'bld-hub-2', cartX: 0.7, cartY: 0.9, width: 26, length: 18, height: 34 },
  { id: 'bld-hub-3', cartX: -0.8, cartY: -0.7, width: 20, length: 24, height: 28 },
  { id: 'bld-hub-4', cartX: 0.9, cartY: -0.6, width: 24, length: 24, height: 48, isAccent: true, label: 'Skyline Lab' },
  { id: 'bld-mid-1', cartX: -1.8, cartY: 1.4, width: 22, length: 20, height: 26 },
  { id: 'bld-mid-2', cartX: 1.6, cartY: 1.8, width: 28, length: 20, height: 38 },
  { id: 'bld-mid-3', cartX: -1.5, cartY: -1.6, width: 20, length: 22, height: 30 },
  { id: 'bld-mid-4', cartX: 2.1, cartY: -1.4, width: 24, length: 18, height: 32 },
  { id: 'bld-far-1', cartX: -3.2, cartY: 2.5, width: 26, length: 24, height: 44 },
  { id: 'bld-far-2', cartX: 2.8, cartY: 3.1, width: 20, length: 20, height: 28 },
  { id: 'bld-far-3', cartX: -2.7, cartY: -3.0, width: 22, length: 22, height: 36 },
  { id: 'bld-far-4', cartX: 3.5, cartY: -2.6, width: 30, length: 24, height: 50, isAccent: true },
];

export const CityPulseCanvas: React.FC<CityPulseCanvasProps> = ({
  events,
  centerCoordinates,
  centerLocationName = 'Bandra & BKC Culture Hub',
  selectedEventId,
  onSelectMarker,
  viewportWidth,
  viewportHeight,
  userCoordinates,
  isUserDistant = false,
  onRecenter,
  recenterTrigger,
  zoomLevel = 1.0,
}) => {
  // Panning offset state with animated values for smooth gestures
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const panOffsetRef = useRef({ x: 0, y: 0 });

  // Hub pulse ring animation
  const hubPulseScale = useRef(new Animated.Value(1)).current;
  const hubPulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(hubPulseScale, {
            toValue: 2.4,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(hubPulseScale, {
            toValue: 1.0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(hubPulseOpacity, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(hubPulseOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [hubPulseScale, hubPulseOpacity]);

  // Pan Responder for smooth drag/explore interactions
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6;
        },
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          return Math.abs(gesture.dx) > 12 || Math.abs(gesture.dy) > 12;
        },
        onPanResponderGrant: () => {
          panX.setOffset(panOffsetRef.current.x);
          panY.setOffset(panOffsetRef.current.y);
          panX.setValue(0);
          panY.setValue(0);
        },
        onPanResponderMove: Animated.event([null, { dx: panX, dy: panY }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          panX.flattenOffset();
          panY.flattenOffset();
          const currentX = panOffsetRef.current.x + gesture.dx;
          const currentY = panOffsetRef.current.y + gesture.dy;
          const clampedX = Math.max(-250, Math.min(250, currentX));
          const clampedY = Math.max(-250, Math.min(250, currentY));
          panOffsetRef.current = { x: clampedX, y: clampedY };
          if (currentX !== clampedX || currentY !== clampedY) {
            Animated.parallel([
              Animated.spring(panX, {
                toValue: clampedX,
                friction: 8,
                tension: 60,
                useNativeDriver: false,
              }),
              Animated.spring(panY, {
                toValue: clampedY,
                friction: 8,
                tension: 60,
                useNativeDriver: false,
              }),
            ]).start();
          }
        },
      }),
    [panX, panY]
  );

  // Recenter handler exposed to parent
  const handleRecenter = () => {
    Animated.parallel([
      Animated.spring(panX, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: false,
      }),
      Animated.spring(panY, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: false,
      }),
    ]).start(() => {
      panOffsetRef.current = { x: 0, y: 0 };
    });

    if (onRecenter) {
      onRecenter();
    }
  };

  // Recenter whenever recenterTrigger signal is incremented by parent
  useEffect(() => {
    if (recenterTrigger && recenterTrigger > 0) {
      handleRecenter();
    }
  }, [recenterTrigger]);

  // Recenter automatically when center coordinates change (e.g. hub change)
  useEffect(() => {
    handleRecenter();
  }, [centerCoordinates.latitude, centerCoordinates.longitude]);

  // Dynamically compute optimal viewport scale with interactive zoom factor
  const optimalScale = useMemo(() => {
    const base = getOptimalScale(events, centerCoordinates, viewportWidth, viewportHeight, 80);
    return base * (zoomLevel ?? 1.0);
  }, [events, centerCoordinates, viewportWidth, viewportHeight, zoomLevel]);

  // Viewport configuration
  const viewportConfig: CityPulseViewportConfig = useMemo(() => {
    return {
      center: centerCoordinates,
      scale: optimalScale,
      viewportWidth,
      viewportHeight,
    };
  }, [centerCoordinates, optimalScale, viewportWidth, viewportHeight]);

  // Batch project event markers sorted by depth ascending
  const projectedMarkers = useMemo(() => {
    return batchProjectEvents(events, viewportConfig);
  }, [events, viewportConfig]);

  // Center hub screen coordinate
  const hubScreenPoint = useMemo(() => {
    const originCart = { x: 0, y: 0 };
    const originIso = cartesianToIsometric(originCart);
    return isometricToScreen(originIso, originCart, viewportConfig);
  }, [viewportConfig]);

  // Projected building geometries
  const projectedBuildings = useMemo(() => {
    return PROCEDURAL_BUILDINGS.map((b) => {
      const cart = { x: b.cartX, y: b.cartY };
      const iso = cartesianToIsometric(cart);
      const screen = isometricToScreen(iso, cart, viewportConfig);
      return {
        ...b,
        screenX: screen.screenX,
        screenY: screen.screenY,
        depth: screen.depth,
        visible: screen.visible,
      };
    }).filter((b) => b.visible);
  }, [viewportConfig]);

  return (
    <View style={styles.canvasContainer} {...panResponder.panHandlers}>
      {/* Background Gradient & Ambient Aura */}
      <LinearGradient
        colors={['#050608', '#090B0F', '#07080B']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle Radial Glow behind active hub */}
      <View
        style={[
          styles.ambientHubGlow,
          {
            left: hubScreenPoint.screenX - 160,
            top: hubScreenPoint.screenY - 160,
          },
        ]}
        pointerEvents="none"
      />

      {/* Animated Movable City Layer */}
      <Animated.View
        style={[
          styles.movableLayer,
          {
            transform: [{ translateX: panX }, { translateY: panY }],
          },
        ]}
      >
        {/* 1. Stylized Isometric Ground Grid & Road Network */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Main Diagonal Arterial Roads */}
          <View
            style={[
              styles.arterialRoad,
              {
                left: hubScreenPoint.screenX - 450,
                top: hubScreenPoint.screenY,
                transform: [{ rotate: '-30deg' }],
              },
            ]}
          />
          <View
            style={[
              styles.arterialRoad,
              {
                left: hubScreenPoint.screenX - 450,
                top: hubScreenPoint.screenY,
                transform: [{ rotate: '30deg' }],
              },
            ]}
          />

          {/* Concentric District Boundary Rings (2km, 5km, 10km scale guides) */}
          {[1.5, 3.5, 6.0].map((radiusKm, idx) => {
            const ringDiameter = radiusKm * optimalScale * 2;
            return (
              <View
                key={`ring-${idx}`}
                style={[
                  styles.districtRing,
                  {
                    left: hubScreenPoint.screenX - ringDiameter / 2,
                    top: hubScreenPoint.screenY - ringDiameter / 3.4,
                    width: ringDiameter,
                    height: ringDiameter / 1.7,
                    borderRadius: ringDiameter / 2,
                    borderColor:
                      idx === 0
                        ? 'rgba(255, 107, 0, 0.22)'
                        : 'rgba(255, 255, 255, 0.05)',
                  },
                ]}
              >
                <Text style={styles.ringLabelText}>{radiusKm} km</Text>
              </View>
            );
          })}
        </View>

        {/* 2. Procedural 2.5D Isometric Buildings */}
        {projectedBuildings.map((b) => {
          const bldgZIndex = Math.max(5, Math.min(4000, 1500 + b.depth));
          return (
            <View
              key={b.id}
              style={[
                styles.buildingWrapper,
                {
                  left: b.screenX - b.width / 2,
                  top: b.screenY - b.height,
                  width: b.width,
                  height: b.height,
                  zIndex: bldgZIndex,
                },
              ]}
              pointerEvents="none"
            >
              {/* Building Rooftop */}
              <View
                style={[
                  styles.buildingRoof,
                  { width: b.width, height: b.length / 2 },
                  b.isAccent && styles.buildingRoofAccent,
                ]}
              />

              {/* Building Facade (Left Shadow) */}
              <View
                style={[
                  styles.buildingFacadeLeft,
                  { width: b.width / 2, height: b.height - b.length / 4 },
                ]}
              />

              {/* Building Facade (Right Light) */}
              <View
                style={[
                  styles.buildingFacadeRight,
                  {
                    left: b.width / 2,
                    width: b.width / 2,
                    height: b.height - b.length / 4,
                  },
                  b.isAccent && styles.buildingFacadeRightAccent,
                ]}
              />

              {/* Roof Light Spike */}
              {b.isAccent && <View style={styles.roofSpike} />}
            </View>
          );
        })}

        {/* 3. Center Discovery Hub Beacon with Radiating Pulse Rings */}
        <View
          style={[
            styles.hubBeaconWrapper,
            {
              left: hubScreenPoint.screenX - 40,
              top: hubScreenPoint.screenY - 40,
              zIndex: 3500,
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Animated Radiating Pulse Ring */}
          <Animated.View
            style={[
              styles.hubPulseRing,
              {
                transform: [{ scale: hubPulseScale }],
                opacity: hubPulseOpacity,
              },
            ]}
          />

          {/* Central Beacon Disc */}
          <View style={styles.hubBeaconDisc}>
            <Ionicons name="radio" size={14} color={colors.orangePrimary} />
          </View>

          {/* Hub Title Pill */}
          <View style={styles.hubTitlePill}>
            <View style={styles.hubLiveDot} />
            <Text style={styles.hubTitleText} numberOfLines={1}>
              {centerLocationName}
            </Text>
          </View>
        </View>

        {/* 4. Interactive Event Markers */}
        {projectedMarkers.map((marker) => {
          const isSelected = marker.eventId === selectedEventId;
          return (
            <CityPulseMarker
              key={marker.eventId}
              marker={marker}
              isSelected={isSelected}
              onPress={onSelectMarker}
            />
          );
        })}
      </Animated.View>

      {/* Floating Recenter HUD Control */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={handleRecenter}
        activeOpacity={0.8}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="locate" size={18} color={colors.orangePrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#07080B',
  },
  ambientHubGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  movableLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  arterialRoad: {
    position: 'absolute',
    width: 900,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  districtRing: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 10,
  },
  ringLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 0.5,
  },
  buildingWrapper: {
    position: 'absolute',
  },
  buildingRoof: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#1E2333',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buildingRoofAccent: {
    backgroundColor: 'rgba(255, 107, 0, 0.25)',
    borderColor: 'rgba(255, 107, 0, 0.5)',
  },
  buildingFacadeLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: '#11141E',
    borderLeftWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  buildingFacadeRight: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#181C29',
    borderRightWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  buildingFacadeRightAccent: {
    backgroundColor: '#1D2130',
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  roofSpike: {
    position: 'absolute',
    top: -6,
    left: '50%',
    marginLeft: -1,
    width: 2,
    height: 6,
    backgroundColor: colors.orangePrimary,
  },
  hubBeaconWrapper: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubPulseRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.5)',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  hubBeaconDisc: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(19, 21, 31, 0.95)',
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  hubTitlePill: {
    position: 'absolute',
    bottom: -18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(19, 21, 31, 0.92)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    maxWidth: 160,
  },
  hubLiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.orangePrimary,
  },
  hubTitleText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  recenterButton: {
    position: 'absolute',
    right: 18,
    bottom: 110,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(19, 21, 31, 0.92)',
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

