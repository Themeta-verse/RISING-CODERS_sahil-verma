import React from 'react';
import { Coordinates, HyperlocalEvent, ProjectedSpatialMarker } from '../types';
import { CityPulseCanvas } from './CityPulseCanvas';

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
}

/**
 * Native mobile fallback implementation of CityPulse3DCanvas.
 * On Android / iOS, renders the optimized native 2.5D projection engine.
 * On Web, the platform-specific CityPulse3DCanvas.web.tsx is automatically used by Metro/Webpack.
 */
export const CityPulse3DCanvas: React.FC<CityPulse3DCanvasProps> = (props) => {
  return <CityPulseCanvas {...props} />;
};

