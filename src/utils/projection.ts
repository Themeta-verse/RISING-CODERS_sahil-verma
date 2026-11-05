import type {
  Coordinates,
  CartesianPoint,
  IsometricPoint,
  ScreenPoint,
  ProjectedSpatialMarker,
  CityPulseViewportConfig,
  LocationMismatchInfo,
  HyperlocalEvent,
} from '../types';
import { calculateDistanceKm, formatDistance } from './distance';

/**
 * Standard earth geometry and projection constants.
 * At the equator, 1 deg lat is ~111.32 km.
 * For hyperlocal scopes (< 50 km radius), equirectangular / tangent-plane
 * projection provides sub-meter precision with minimal computation.
 */
export const KM_PER_DEGREE_LAT = 111.32;
export const DEFAULT_ISOMETRIC_ANGLE_RAD = Math.PI / 6; // 30 degrees
export const DEFAULT_SCALE_PX_PER_KM = 18;
export const MIN_SCALE_PX_PER_KM = 4;
export const MAX_SCALE_PX_PER_KM = 45;
export const VIEWPORT_OVERFLOW_MARGIN_PX = 60;

/**
 * Validates whether a given geo-coordinate object contains valid, finite
 * latitude [-90, 90] and longitude [-180, 180] values.
 */
export function isValidCoordinate(coord: unknown): coord is Coordinates {
  if (!coord || typeof coord !== 'object') {
    return false;
  }
  const { latitude, longitude } = coord as Record<string, unknown>;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Projects a geographic (lat, lon) point into a local Cartesian tangent plane (x, y in km)
 * centered at a reference geographic coordinate.
 * - East is +x (km), West is -x (km)
 * - North is +y (km), South is -y (km)
 */
export function geoToCartesian(
  coord: Coordinates,
  center: Coordinates
): CartesianPoint {
  if (!isValidCoordinate(coord) || !isValidCoordinate(center)) {
    return { x: 0, y: 0 };
  }

  const deltaLat = coord.latitude - center.latitude;
  const deltaLon = coord.longitude - center.longitude;

  // Longitudinal shrinkage factor based on center latitude
  const latRad = (center.latitude * Math.PI) / 180;
  const cosLat = Math.cos(latRad);

  const x = deltaLon * KM_PER_DEGREE_LAT * cosLat;
  const y = deltaLat * KM_PER_DEGREE_LAT;

  return {
    x: Math.round(x * 10000) / 10000,
    y: Math.round(y * 10000) / 10000,
  };
}

/**
 * Transforms 2D local Cartesian coordinates (x: East, y: North) into 2.5D
 * isometric projected coordinates (isoX, isoY).
 *
 * In 2.5D isometric view:
 * - Looking from South-West towards North-East
 * - isoX = (x - y) * cos(theta)
 * - isoY = -(x + y) * sin(theta)  [Inverted so North (+y) moves upwards on screen]
 */
export function cartesianToIsometric(
  cart: CartesianPoint,
  angleRad: number = DEFAULT_ISOMETRIC_ANGLE_RAD
): IsometricPoint {
  if (!Number.isFinite(cart.x) || !Number.isFinite(cart.y)) {
    return { isoX: 0, isoY: 0 };
  }

  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const isoX = (cart.x - cart.y) * cosA;
  // Invert Y so positive North (+y) and positive East (+x) go "upwards" on the screen plane
  const isoY = -(cart.x + cart.y) * sinA;

  return {
    isoX: Math.round(isoX * 10000) / 10000,
    isoY: Math.round(isoY * 10000) / 10000,
  };
}

/**
 * Maps 2.5D isometric coordinates to absolute screen pixels within the viewport,
 * centered at (viewportWidth / 2, viewportHeight / 2).
 *
 * Depth calculation for painter's algorithm:
 * Objects further South (smaller y) are closer to the viewer's eye and should
 * render in front of objects further North (higher y).
 */
export function isometricToScreen(
  iso: IsometricPoint,
  cart: CartesianPoint,
  config: CityPulseViewportConfig
): ScreenPoint {
  const width = Math.max(config.viewportWidth, 100);
  const height = Math.max(config.viewportHeight, 100);
  const scale = Number.isFinite(config.scale) && config.scale > 0
    ? config.scale
    : DEFAULT_SCALE_PX_PER_KM;

  const centerX = width / 2;
  const centerY = height / 2;

  const screenX = Math.round(centerX + iso.isoX * scale);
  const screenY = Math.round(centerY + iso.isoY * scale);

  // Depth: larger depth value means closer to camera (rendered on top)
  // Since North is +y (further away), depth = -y (or -cart.y)
  const depth = Math.round((-cart.y) * 1000);

  const margin = VIEWPORT_OVERFLOW_MARGIN_PX;
  const visible =
    screenX >= -margin &&
    screenX <= width + margin &&
    screenY >= -margin &&
    screenY <= height + margin;

  return {
    screenX,
    screenY,
    depth,
    visible,
  };
}

/**
 * Fully projects a single geographic coordinate to all representation stages:
 * Cartesian, Isometric, and Screen pixels.
 */
export function projectCoordinate(
  coord: Coordinates,
  config: CityPulseViewportConfig
): {
  cartesian: CartesianPoint;
  isometric: IsometricPoint;
  screen: ScreenPoint;
  isValid: boolean;
} {
  const valid = isValidCoordinate(coord) && isValidCoordinate(config.center);
  if (!valid) {
    const fallbackCart = { x: 0, y: 0 };
    const fallbackIso = { isoX: 0, isoY: 0 };
    return {
      cartesian: fallbackCart,
      isometric: fallbackIso,
      screen: {
        screenX: config.viewportWidth / 2,
        screenY: config.viewportHeight / 2,
        depth: 0,
        visible: false,
      },
      isValid: false,
    };
  }

  const angle = config.isometricAngle ?? DEFAULT_ISOMETRIC_ANGLE_RAD;
  const cartesian = geoToCartesian(coord, config.center);
  const isometric = cartesianToIsometric(cartesian, angle);
  const screen = isometricToScreen(isometric, cartesian, config);

  return {
    cartesian,
    isometric,
    screen,
    isValid: true,
  };
}

/**
 * Projects a HyperlocalEvent into a full SpatialMarker ready for 2.5D rendering.
 */
export function projectEvent(
  event: HyperlocalEvent,
  config: CityPulseViewportConfig
): ProjectedSpatialMarker {
  const { cartesian, isometric, screen, isValid } = projectCoordinate(
    event.coordinates,
    config
  );

  const distanceKm = isValid
    ? calculateDistanceKm(config.center, event.coordinates)
    : event.distanceKm ?? 0;

  // Apply optional max radius filter
  if (config.maxRadiusKm !== undefined && distanceKm > config.maxRadiusKm) {
    screen.visible = false;
  }

  return {
    eventId: event.id,
    event,
    coordinates: event.coordinates,
    cartesian,
    isometric,
    screen,
    distanceKm,
    isValid,
  };
}

/**
 * Batch projects an array of HyperlocalEvents and returns them sorted by depth
 * for painter's algorithm rendering (furthest North rendered first, closest South on top).
 */
export function batchProjectEvents(
  events: HyperlocalEvent[],
  config: CityPulseViewportConfig
): ProjectedSpatialMarker[] {
  if (!Array.isArray(events)) {
    return [];
  }

  const markers: ProjectedSpatialMarker[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev && ev.coordinates) {
      markers.push(projectEvent(ev, config));
    }
  }

  // Sort by depth ascending so that smaller depth (further away) is drawn first,
  // and larger depth (closer to foreground) is drawn last (on top).
  return markers.sort(
    (a, b) => a.screen.depth - b.screen.depth || a.eventId.localeCompare(b.eventId)
  );
}

/**
 * Dynamically calculates the optimal pixels-per-kilometer scale to comfortably fit
 * the event cluster within the current viewport dimensions with safe padding.
 * Optionally incorporates scanRadiusKm to respond dynamically to user radius selection.
 */
export function getOptimalScale(
  events: HyperlocalEvent[],
  center: Coordinates,
  viewportWidth: number,
  viewportHeight: number,
  paddingPx: number = 60,
  scanRadiusKm?: number
): number {
  if (!Array.isArray(events) || events.length === 0 || !isValidCoordinate(center)) {
    if (typeof scanRadiusKm === 'number' && scanRadiusKm > 0) {
      const usable = Math.min(viewportWidth, viewportHeight) - paddingPx * 2;
      const rScale = usable / (scanRadiusKm * 2);
      return Math.min(
        Math.max(Math.round(rScale * 10) / 10, MIN_SCALE_PX_PER_KM),
        MAX_SCALE_PX_PER_KM
      );
    }
    return DEFAULT_SCALE_PX_PER_KM;
  }

  const usableWidth = Math.max(viewportWidth - paddingPx * 2, 100);
  const usableHeight = Math.max(viewportHeight - paddingPx * 2, 100);

  let maxIsoX = 0.5;
  let maxIsoY = 0.5;

  if (typeof scanRadiusKm === 'number' && scanRadiusKm > 0) {
    maxIsoX = Math.max(maxIsoX, scanRadiusKm * 0.7);
    maxIsoY = Math.max(maxIsoY, scanRadiusKm * 0.7);
  }

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!isValidCoordinate(ev.coordinates)) continue;

    const cart = geoToCartesian(ev.coordinates, center);
    const iso = cartesianToIsometric(cart);

    maxIsoX = Math.max(maxIsoX, Math.abs(iso.isoX));
    maxIsoY = Math.max(maxIsoY, Math.abs(iso.isoY));
  }

  const scaleX = (usableWidth / 2) / maxIsoX;
  const scaleY = (usableHeight / 2) / maxIsoY;

  const rawScale = Math.min(scaleX, scaleY);

  // Clamp within safe limits
  return Math.min(
    Math.max(Math.round(rawScale * 10) / 10, MIN_SCALE_PX_PER_KM),
    MAX_SCALE_PX_PER_KM
  );
}

/**
 * Detects whether the user's actual physical coordinates diverge significantly
 * (> thresholdKm) from the active event cluster/discovery area.
 *
 * Prevents misleading the user into believing demo events are in their physical vicinity.
 */
export function detectLocationMismatch(
  userCoords: Coordinates,
  centerCoords: Coordinates,
  userLocationName: string = 'Current Location',
  activeAreaName: string = 'Indiranagar Arts Hub',
  thresholdKm: number = 50
): LocationMismatchInfo {
  if (!isValidCoordinate(userCoords) || !isValidCoordinate(centerCoords)) {
    return {
      isMismatch: false,
      userDistanceKm: 0,
      userLocationName,
      activeAreaName,
    };
  }

  const userDistanceKm = calculateDistanceKm(userCoords, centerCoords);
  const isMismatch = userDistanceKm > thresholdKm;

  // Resolve genuine physical location name if it was erroneously defaulted to Bengaluru hub
  let resolvedUserLocation = userLocationName;
  if (
    isMismatch &&
    (!resolvedUserLocation ||
      resolvedUserLocation === activeAreaName ||
      resolvedUserLocation.toLowerCase().includes('indiranagar') ||
      resolvedUserLocation.toLowerCase().includes('bengaluru') ||
      resolvedUserLocation.toLowerCase().includes('bangalore'))
  ) {
    if (
      userCoords.latitude >= 18.5 &&
      userCoords.latitude <= 19.5 &&
      userCoords.longitude >= 72.5 &&
      userCoords.longitude <= 73.3
    ) {
      resolvedUserLocation = 'Mumbai (Physical GPS)';
    } else {
      resolvedUserLocation = 'Physical GPS Location';
    }
  }

  let disclaimer: string | undefined;
  if (isMismatch) {
    disclaimer = `Physical GPS: ${resolvedUserLocation} (${formatDistance(
      userDistanceKm
    )} away) • Exploring: ${activeAreaName}, Bengaluru (Simulated)`;
  }

  return {
    isMismatch,
    userDistanceKm,
    userLocationName: resolvedUserLocation,
    activeAreaName,
    disclaimer,
  };
}
