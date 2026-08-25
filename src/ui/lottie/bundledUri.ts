/**
 * Resolve a Metro/Expo asset to a URI the Lottie player can fetch.
 *
 * On web the bundler already emits a URL string (or `{ uri }`). Prefer that
 * before `Image.resolveAssetSource`, which either throws on react-native-web
 * or stringifies a numeric module id into a useless `"42"`.
 */

export function bundledAssetUri(
  asset: unknown,
  resolve?: (source: unknown) => { uri?: string } | null | undefined,
): string | undefined {
  if (typeof asset === 'string' && isUsableAssetUri(asset)) return asset;
  if (asset && typeof asset === 'object' && 'uri' in asset) {
    const uri = (asset as { uri: unknown }).uri;
    if (typeof uri === 'string' && isUsableAssetUri(uri)) return uri;
  }
  if (typeof resolve === 'function') {
    try {
      const resolved = resolve(asset);
      if (typeof resolved?.uri === 'string' && isUsableAssetUri(resolved.uri)) {
        return resolved.uri;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isUsableAssetUri(uri: string): boolean {
  if (uri.length < 2) return false;
  if (/^\d+$/.test(uri)) return false;
  return (
    uri.startsWith('http') ||
    uri.startsWith('file:') ||
    uri.startsWith('data:') ||
    uri.startsWith('blob:') ||
    uri.startsWith('/') ||
    uri.startsWith('assets/') ||
    uri.includes('.lottie')
  );
}
