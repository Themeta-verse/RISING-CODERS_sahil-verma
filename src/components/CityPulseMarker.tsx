import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ProjectedSpatialMarker, EventCategory } from '../types';
import { colors, borderRadius } from '../theme';

const MARKER_WIDTH = 54;
const MARKER_HEIGHT = 62;

interface CityPulseMarkerProps {
  marker: ProjectedSpatialMarker;
  isSelected: boolean;
  onPress: (marker: ProjectedSpatialMarker) => void;
}

/**
 * Returns an appropriate Ionicons glyph name for each event category.
 */
function getCategoryIcon(category: EventCategory): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'Music':
      return 'musical-notes';
    case 'Comedy':
      return 'happy';
    case 'Workshops':
      return 'build';
    case 'College':
      return 'school';
    case 'Sports':
      return 'basketball';
    case 'Meetups':
      return 'people';
    case 'Parties':
      return 'flame';
    default:
      return 'sparkles';
  }
}

export const CityPulseMarker: React.FC<CityPulseMarkerProps> = ({
  marker,
  isSelected,
  onPress,
}) => {
  const { event, screen, distanceKm, isValid } = marker;

  // Selected pulse wave animations (native driver enabled)
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;
  const markerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (isSelected) {
      // Gentle spring scale on selection
      Animated.spring(markerScale, {
        toValue: 1.15,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      // Continuous pulse wave around selected marker
      animation = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 2.2,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1.0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.7,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animation.start();
    } else {
      Animated.spring(markerScale, {
        toValue: 1.0,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }).start();
      pulseScale.setValue(1);
      pulseOpacity.setValue(0);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isSelected, markerScale, pulseScale, pulseOpacity]);

  if (!isValid || !screen.visible) {
    return null;
  }

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress(marker);
  };

  const iconName = getCategoryIcon(event.category);
  const isFree = event.isFree;

  // Elevation based on depth: foreground has higher depth and higher zIndex
  const baseZIndex = isSelected ? 9999 : Math.max(10, Math.min(5000, 2000 + screen.depth));
  const baseElevation = isSelected ? 30 : Math.max(2, Math.min(25, Math.round((screen.depth + 5000) / 400)));

  return (
    <Animated.View
      style={[
        styles.markerContainer,
        {
          left: screen.screenX - MARKER_WIDTH / 2,
          top: screen.screenY - MARKER_HEIGHT,
          zIndex: baseZIndex,
          elevation: baseElevation,
          transform: [{ scale: markerScale }],
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Animated Pulse Halo for Selected Marker */}
      {isSelected && (
        <Animated.View
          style={[
            styles.pulseHalo,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />
      )}

      {/* Touch Target Pin */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={styles.touchTarget}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {/* Selected Label Banner */}
        {isSelected && (
          <View style={styles.selectedBanner}>
            <Text style={styles.selectedTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={styles.selectedDist}>{distanceKm.toFixed(1)} km</Text>
          </View>
        )}

        {/* Pin Body */}
        <View
          style={[
            styles.pinBody,
            isSelected && styles.pinBodySelected,
            isFree && styles.pinBodyFree,
          ]}
        >
          <Ionicons
            name={iconName}
            size={isSelected ? 16 : 13}
            color={isSelected ? '#07080B' : colors.orangePrimary}
          />
        </View>

        {/* Downward Needle Point */}
        <View
          style={[
            styles.needlePoint,
            isSelected && styles.needlePointSelected,
            isFree && styles.needlePointFree,
          ]}
        />

        {/* Ground Projection Shadow / Footprint */}
        <View style={styles.groundShadow} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    position: 'absolute',
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  pulseHalo: {
    position: 'absolute',
    bottom: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 107, 0, 0.35)',
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
  },
  selectedBanner: {
    position: 'absolute',
    bottom: 38,
    backgroundColor: 'rgba(19, 21, 31, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.orangePrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  selectedTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: 90,
  },
  selectedDist: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.orangePrimary,
  },
  pinBody: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  pinBodySelected: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.orangePrimary,
    borderColor: '#FFFFFF',
    borderWidth: 2,
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  pinBodyFree: {
    borderColor: colors.amberPrimary,
  },
  needlePoint: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.orangePrimary,
    marginTop: -1,
  },
  needlePointSelected: {
    borderTopColor: '#FFFFFF',
    borderTopWidth: 7,
  },
  needlePointFree: {
    borderTopColor: colors.amberPrimary,
  },
  groundShadow: {
    width: 12,
    height: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    marginTop: 2,
  },
});

