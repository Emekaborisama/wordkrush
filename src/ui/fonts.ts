import {
  Exo2_600SemiBold,
  Exo2_700Bold,
  Exo2_800ExtraBold,
  Exo2_900Black,
  useFonts,
} from '@expo-google-fonts/exo-2';

/**
 * The four Exo 2 faces `theme.font` names. One list, so the app and the dev
 * UI kit can never load different faces.
 */
export function useAppFonts(): [boolean, Error | null] {
  return useFonts({
    Exo2_600SemiBold,
    Exo2_700Bold,
    Exo2_800ExtraBold,
    Exo2_900Black,
  });
}
