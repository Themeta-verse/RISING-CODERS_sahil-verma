import { Platform } from 'react-native';

declare global {
  interface Window {
    maplibregl?: any;
    __maplibreLoadingPromise?: Promise<any>;
  }
}

const MAPLIBRE_JS_URL = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const MAPLIBRE_CSS_URL = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';

/**
 * Loads MapLibre GL JS and its stylesheet dynamically in web environments.
 * Returns the maplibregl object on web, or null on native platforms.
 */
export function loadMapLibreGL(): Promise<any> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.maplibregl) {
    return Promise.resolve(window.maplibregl);
  }

  if (window.__maplibreLoadingPromise) {
    return window.__maplibreLoadingPromise;
  }

  window.__maplibreLoadingPromise = new Promise((resolve, reject) => {
    // 1. Inject CSS if not present
    const existingLink = document.querySelector(`link[href*="maplibre-gl"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPLIBRE_CSS_URL;
      document.head.appendChild(link);
    }

    // 2. Inject JS if not present
    const existingScript = document.querySelector(`script[src*="maplibre-gl"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.maplibregl));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = MAPLIBRE_JS_URL;
    script.async = true;
    script.onload = () => {
      resolve(window.maplibregl);
    };
    script.onerror = (err) => {
      console.warn('Failed to load MapLibre GL from CDN, falling back to 2.5D renderer', err);
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return window.__maplibreLoadingPromise;
}

