import { registerRootComponent } from 'expo';

import type { ComponentType } from 'react';
import App from './App';
import { wantsUiKit } from './src/ui/dev/wantsUiKit';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// `?kit` on a dev build opens the design-system page instead of the app. The
// `__DEV__` branch is stripped from production bundles, page and all.
let Root: ComponentType = App;
if (__DEV__ && wantsUiKit()) {
  const kit: typeof import('./src/ui/dev/UiKit') = require('./src/ui/dev/UiKit');
  Root = kit.KitRoot;
}
registerRootComponent(Root);
