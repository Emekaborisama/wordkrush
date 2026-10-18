import { registerRootComponent } from 'expo';

import App from './App';
import { KitRoot, wantsUiKit } from './src/ui/dev/UiKit';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// `?kit` on a dev build opens the design-system page instead of the app.
registerRootComponent(wantsUiKit() ? KitRoot : App);
