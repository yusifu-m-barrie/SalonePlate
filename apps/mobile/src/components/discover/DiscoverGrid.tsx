import { Children, ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { spacing } from '../../constants/theme';

type Props = {
  columns: number;
  children: ReactNode;
};

const GAP = 12;

export function DiscoverGrid({ columns, children }: Props) {
  const { width } = useWindowDimensions();
  const horizontalPad = spacing.lg * 2;
  const itemWidth = (width - horizontalPad - GAP * (columns - 1)) / columns;

  return (
    <View style={styles.grid}>
      {Children.map(children, (child, index) => (
        <View key={index} style={{ width: itemWidth, marginBottom: GAP }}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
