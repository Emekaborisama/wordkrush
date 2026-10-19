import { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { digitGapFor, pixelBoxSize, STUD_MIN_PX } from '../blockMath';
import { digitCells } from '../shapes';
import { type CubeColor } from '../theme';
import { BlockTile } from './BlockTile';

export type BlockDigitsProps = {
  /** Digits only; anything else in the string is skipped. */
  value: number | string;
  /** One cube's size in px. */
  cell?: number;
  color?: CubeColor | string;
  /** Space between cubes. ≈12% of the cell by default. */
  gap?: number;
  /** Defaults to the value itself. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * A number built out of little cubes, like the kit's Levels list: each lit
 * cell of a 3×5 digit is a mini BlockTile, studded once it is big enough to
 * read one. Sizes itself to the glyphs, so it sits in a row like text.
 */
export function BlockDigits({ value, cell = 9, color = 'red', gap, accessibilityLabel, style }: BlockDigitsProps) {
  const text = String(value);
  const grid = useMemo(() => digitCells(text), [text]);
  const g = gap ?? digitGapFor(cell);
  const box = pixelBoxSize(grid.cols, grid.rows, cell, g);
  const stud = cell >= STUD_MIN_PX;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
      style={[{ width: box.width, height: box.height }, style]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={{ width: box.width, height: box.height }}
      >
        {grid.cells.map(([x, y]) => (
          <BlockTile
            key={`${x},${y}`}
            size={cell}
            color={color}
            stud={stud}
            style={{ position: 'absolute', left: x * (cell + g), top: y * (cell + g) }}
          />
        ))}
      </View>
    </View>
  );
}
