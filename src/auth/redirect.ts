/**
 * Where Supabase should send the player after they tap the magic link.
 *
 * Web uses the current origin so local, Railway, and wordKrush.com each get a
 * working callback without a build-time URL. Native uses the Expo deep-link
 * (`wordkrush://` in a store build, `exp://` in Expo Go).
 */
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { webAuthRedirectUrl } from './redirect-url';

export function authRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return webAuthRedirectUrl(window.location.origin);
  }
  return Linking.createURL('auth/callback');
}
