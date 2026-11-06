import { Platform, StatusBar, Dimensions } from 'react-native';

/**
 * Returns the safe top inset for status bar / camera punch-holes.
 * On Android standalone edge-to-edge APKs, insets.top might evaluate to 0
 * before native layout passes or if not reported by the OS window.
 * StatusBar.currentHeight provides the exact hardware status bar height.
 */
export const getSafeTop = (insetsTop: number = 0): number => {
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 36) : 0;
  // Modern Android status bars/punch-holes are typically 36-54dp.
  return Math.max(insetsTop, statusBarHeight, Platform.OS === 'ios' ? 44 : 38);
};

/**
 * Returns the safe bottom inset for navigation bars (e.g. Android 3-button bar or gesture bar).
 * On Android devices with a 3-button navigation bar, insets.bottom is typically 48-56dp.
 * On devices with gesture pills, it is ~20-34dp.
 * Ensures a minimum breathing margin so UI never collides with physical edges.
 */
export const getSafeBottom = (insetsBottom: number = 0): number => {
  return Math.max(insetsBottom, Platform.OS === 'android' ? 16 : 8);
};

/**
 * Returns the total height required for the bottom tab bar
 * so that tab icons and labels sit strictly above the 3 navigation buttons.
 */
export const getTabBarHeight = (insetsBottom: number = 0): number => {
  // Base tab content area: 54dp + dynamic bottom inset
  return 54 + getSafeBottom(insetsBottom);
};

/**
 * Returns the bottom padding needed for scrollable screen content
 * to ensure the bottommost items clear the tab bar and system buttons.
 */
export const getScrollBottomPadding = (insetsBottom: number = 0, hasTabBar: boolean = true): number => {
  if (hasTabBar) {
    return getTabBarHeight(insetsBottom) + 24;
  }
  return getSafeBottom(insetsBottom) + 24;
};

/**
 * Returns responsive card width and height tailored to mobile screen sizes.
 * Avoids oversized cards on compact or medium screens while remaining
 * generous and crisp on larger modern devices.
 */
export const getResponsiveCardDimensions = (windowWidth?: number, windowHeight?: number) => {
  const { width: winWidth, height: winHeight } = Dimensions.get('window');
  const w = windowWidth || winWidth;
  const h = windowHeight || winHeight;

  // Max width of 420 for tablets/wide foldables, 16px horizontal margins
  const cardWidth = Math.min(w - 32, 420);

  // Keep height proportional to screen height (~40-42%), bounded between 300dp and 340dp
  // (reduced from the previous fixed 380dp)
  const cardHeight = Math.min(340, Math.max(295, Math.round(h * 0.40)));

  return {
    cardWidth,
    cardHeight,
    cardInterval: cardHeight + 20,
  };
};

