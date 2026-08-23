/**
 * iOS / Android: no feedback widget yet.
 *
 * Metro resolves this file on native and `widget.ts` on web, so calling code
 * never branches on platform. Keep the exports here in step with `widget.ts`;
 * a missing stub is a native-only crash that testing on web will not catch —
 * the same trap `native/haptics.ts` documents.
 *
 * This is a stub rather than an oversight. `@userback/widget` is a browser
 * SDK: it injects a `<script>` tag and reaches for `document`, neither of
 * which exists in React Native. Userback ships a separate `@userback/react-
 * native` package (Beta) that authenticates with its own **Mobile SDK key** —
 * not the web access token this app already has — created under Workspace
 * Settings → Mobile SDK.
 *
 * To turn native on: create that key, add it as `EXPO_PUBLIC_USERBACK_MOBILE_KEY`,
 * install `@userback/react-native`, and implement the four exports below
 * against `UserbackSDK.start({ accessToken, userData })`. Note it is a native
 * module, so it needs a development build — it will not run in Expo Go.
 * Until then `isUserbackConfigured` is false here, and the drawer simply does
 * not offer an entry that would do nothing.
 */
import type { UserbackIdentity } from './identity';

export const isUserbackConfigured = false;

export function syncUserback(_identity: UserbackIdentity | null): void {}

export function openUserback(): void {}

export function setUserbackLauncherVisible(_visible: boolean): void {}
