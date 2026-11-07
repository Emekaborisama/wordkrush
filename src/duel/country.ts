/**
 * Countries and their flags. Pure. A country is an ISO 3166-1 alpha-2 code;
 * the flag is drawn from it as an emoji, so no flag images ship with the app.
 * (Windows browsers show the two letters instead, which still reads.)
 */

/** ISO 3166-1 alpha-2, for the flag picker. */
export const COUNTRY_CODES: readonly string[] = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
  'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

const KNOWN = new Set(COUNTRY_CODES);

/** A code we can draw, upper-cased; `null` for anything else (Cloudflare's XX and T1 included). */
export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return KNOWN.has(code) ? code : null;
}

/** The flag emoji for a code: each letter becomes its regional-indicator symbol. */
export function flagEmoji(code: string): string {
  return [...code.toUpperCase()].map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join('');
}

/** The region in a BCP 47 locale ("en-NG" gives NG), the offline guess at a country. */
export function countryFromLocale(locale: string): string | null {
  const region = locale.split(/[-_]/).slice(1).find((part) => /^[A-Za-z]{2}$/.test(part));
  return normalizeCountry(region);
}

/** A readable country name where the platform has one, else the code. */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
