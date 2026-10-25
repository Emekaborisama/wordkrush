import { registerRootComponent } from 'expo';

import type { ComponentType } from 'react';
import App from './App';
import { installErrorReporting, installWebVitals } from './src/analytics/observe';
import { withErrorBoundary } from './src/ui/ErrorBoundary';
import { wantsUiKit } from './src/ui/dev/wantsUiKit';

// Before the first render, so a crash on startup is still counted (after
// consent; see docs/OBSERVABILITY.md).
installErrorReporting();
installWebVitals();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// `?kit` on a dev build opens the design-system page instead of the app. The
// `__DEV__` branch is stripped from production bundles, page and all.
let Root: ComponentType = withErrorBoundary(App);
if (__DEV__ && wantsUiKit()) {
  const kit: typeof import('./src/ui/dev/UiKit') = require('./src/ui/dev/UiKit');
  Root = kit.KitRoot;
}
registerRootComponent(Root);
