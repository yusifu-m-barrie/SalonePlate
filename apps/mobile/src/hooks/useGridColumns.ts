import { useWindowDimensions } from 'react-native';

/** 2 columns on phones, 3 on wider screens (tablets / large phones landscape). */
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  return width >= 720 ? 3 : 2;
}
