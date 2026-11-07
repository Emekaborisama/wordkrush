import type { ImageSourcePropType } from 'react-native';

/**
 * 3D icons from Microsoft's Fluent Emoji (MIT, `assets/fluent/LICENSE`),
 * resized to 128 px. The scenery of the level maps, after the Animal Heroes
 * kit's meadow. The guide on the path is the WordKrush cat
 * (`src/ui/mascot/`), which replaced the per-game lion, monkey and fox.
 */
export const FLUENT = {
  panda: require('../../assets/fluent/panda.png'),
  frog: require('../../assets/fluent/frog.png'),
  tiger: require('../../assets/fluent/tiger_face.png'),
  rabbit: require('../../assets/fluent/rabbit_face.png'),
  pig: require('../../assets/fluent/pig_face.png'),
  penguin: require('../../assets/fluent/penguin.png'),
  lion: require('../../assets/fluent/lion.png'),
  monkey: require('../../assets/fluent/monkey_face.png'),
  fox: require('../../assets/fluent/fox.png'),
  giraffe: require('../../assets/fluent/giraffe.png'),
  tree: require('../../assets/fluent/deciduous_tree.png'),
  pine: require('../../assets/fluent/evergreen_tree.png'),
  house: require('../../assets/fluent/house_with_garden.png'),
  tulip: require('../../assets/fluent/tulip.png'),
  sunflower: require('../../assets/fluent/sunflower.png'),
  mushroom: require('../../assets/fluent/mushroom.png'),
  star: require('../../assets/fluent/star.png'),
  calendar: require('../../assets/fluent/calendar.png'),
  swords: require('../../assets/fluent/swords.png'),
  ghost: require('../../assets/fluent/ghost.png'),
} satisfies Record<string, ImageSourcePropType>;

export type FluentName = keyof typeof FLUENT;

/** Scenery that lines the meadow map, in order, beside the stones. */
export const MEADOW_SCENERY: readonly FluentName[] = [
  'tree', 'frog', 'tulip', 'house', 'panda', 'pine', 'sunflower', 'rabbit', 'mushroom', 'penguin', 'tree', 'pig', 'giraffe', 'tulip', 'tiger', 'pine',
];
