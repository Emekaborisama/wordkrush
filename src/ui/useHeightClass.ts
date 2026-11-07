import { useWindowDimensions } from 'react-native';
import { heightClass, type HeightClass } from './layout';

/** The window's height class, re-read when the window (or browser chrome) resizes. */
export function useHeightClass(): HeightClass {
  return heightClass(useWindowDimensions().height);
}
