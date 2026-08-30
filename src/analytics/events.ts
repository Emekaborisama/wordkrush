import type { PlayerCountBucket } from '../games/campaign';
import type { ArrivalAttribution, EntrySource, UtmMedium, UtmSource } from './attribution';

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';
export type AuthStatus = 'guest' | 'signed_in';
export type GameId = 'more-or-less' | 'clueless' | 'wordfall';
export type { ArrivalAttribution, EntrySource, UtmMedium, UtmSource };

type CommonGameProperties = {
  game_id: string;
};

type ArrivalProperties = ArrivalAttribution;
type CluelessLevelProperties = {
  /** Historical score partitions, now selected by level-owned assistance. */
  assistance_context?: 'easy' | 'standard' | 'expert';
  hint_source?: 'opening' | 'guess_threshold' | 'none';
  path_phase?: 'tutorial' | 'daily' | 'team';
};

export type AnalyticsEvents = {
  analytics_consent_changed: {
    choice: 'opted_in';
    surface: 'prompt' | 'settings';
  };
  app_opened: ArrivalProperties & {
    backend_configured: boolean;
    auth_status: AuthStatus;
  };
  landing_viewed: ArrivalProperties & {
    surface: 'web' | 'native';
  };
  app_ready: {
    duration_ms: number;
    boards_result: 'loaded' | 'fallback';
    session_result: 'signed_in' | 'guest';
  };
  screen_viewed: {
    screen_name: 'hub' | 'home' | 'game' | 'over' | 'scores' | 'auth' | 'teams' | 'live-lobby' | 'live-results';
    game_id?: string;
  };
  game_selected: CommonGameProperties & {
    source: 'hub' | 'drawer';
  };
  run_started: CommonGameProperties & CluelessLevelProperties & {
    is_resume: boolean;
    category_id?: string;
    puzzle_number?: number;
    level_number?: number;
  };
  run_completed: CommonGameProperties & CluelessLevelProperties & {
    outcome: 'win' | 'loss';
    score: number;
    score_kind: 'streak' | 'guesses_used' | 'points';
    duration_ms?: number;
    is_new_best: boolean;
    category_id?: string;
    puzzle_number?: number;
    level_number?: number;
    relaxed_rounds?: number;
  };
  label_round_passed: CommonGameProperties & {
    round_id: string;
    rounds_passed: number;
    item_count: number;
  };
  guess_submitted: CommonGameProperties & CluelessLevelProperties & {
    guess_index: number;
    puzzle_number?: number;
    level_number?: number;
    choice?: 'more' | 'less';
    result_kind: 'correct' | 'incorrect' | 'valid' | 'not_a_word' | 'already_guessed';
    rank_bucket?: 'win' | 'top_10' | 'top_100' | 'cold' | 'unranked';
  };
  round_resolved: CommonGameProperties & {
    correct: boolean;
    round_index: number;
    streak_bucket: '0_4' | '5_9' | '10_19' | '20_plus';
  };
  word_submitted: CommonGameProperties & {
    level_number: number;
    word_length_bucket: 'under_3' | '3_4' | '5_7' | '8_plus';
    valid: boolean;
    rejection_kind?: 'too_short' | 'not_a_word' | 'already_played';
    score_delta_bucket: '0' | '1_49' | '50_149' | '150_plus';
    chain_length_bucket: '0' | '1' | '2_3' | '4_plus';
  };
  level_completed: CommonGameProperties & {
    level_number: number;
    score: number;
    duration_ms: number;
    words_played: number;
    moves_left_bucket: '0' | '1_4' | '5_plus';
  };
  level_failed: CommonGameProperties & {
    level_number: number;
    score: number;
    duration_ms: number;
    failure_mode: 'time' | 'moves';
  };
  daily_puzzle_viewed: CommonGameProperties & CluelessLevelProperties & {
    puzzle_number: number;
    level_number?: number;
    already_completed: boolean;
  };
  game_over_action: CommonGameProperties & {
    action: 'play_again' | 'scores' | 'home' | 'share';
    streak_bucket: '0_4' | '5_9' | '10_19' | '20_plus';
    is_new_best: boolean;
  };
  /**
   * A result actually left the app — the share loop's only real number.
   *
   * Fired on a completed share, not on the button press: a dismissed share
   * sheet is a decision, not a share, and counting it would flatter the rate.
   * `method` separates the two paths because they convert differently — a share
   * sheet lands the result in a conversation, while a clipboard copy still
   * needs the player to paste it somewhere.
   *
   * Pairs with `entry_source: 'share'` on the arrival side (see
   * `resolveAttribution`), which is what closes the loop.
   */
  result_shared: CommonGameProperties & {
    outcome: 'win' | 'loss';
    score_kind: 'streak' | 'guesses_used' | 'points';
    method: 'share_sheet' | 'clipboard';
    is_new_best: boolean;
  };
  scores_viewed: {
    game_id: string;
    run_count_bucket: '0' | '1_2' | '3_9' | '10_plus';
    has_highlight: boolean;
    auth_status: AuthStatus;
  };
  auth_prompt_viewed: {
    game_id: string;
    run_count_bucket: '0' | '1_2' | '3_9' | '10_plus';
  };
  auth_submitted: {
    mode: 'sign_in' | 'sign_up';
    validation_result: 'valid' | 'invalid';
    error_category?: 'credentials' | 'network' | 'rate_limit' | 'unconfirmed' | 'other';
  };
  auth_succeeded: {
    mode: 'sign_in' | 'sign_up';
  };
  auth_failed: {
    mode: 'sign_in' | 'sign_up';
    error_category: 'credentials' | 'network' | 'rate_limit' | 'unconfirmed' | 'other';
  };
  auth_skipped: Record<string, never>;
  auth_session_restored: {
    result: 'signed_in';
  };
  signed_out: Record<string, never>;
  team_created: Record<string, never>;
  team_joined: {
    via: 'code' | 'invite';
  };
  team_renamed: Record<string, never>;
  team_left: Record<string, never>;
  team_disbanded: Record<string, never>;
  match_created: CommonGameProperties & {
    level_number: number;
  };
  match_started: CommonGameProperties & {
    level_number: number;
    player_count_bucket: PlayerCountBucket;
  };
  match_finished: CommonGameProperties & {
    level_number: number;
    player_count_bucket: PlayerCountBucket;
    complete: boolean;
    outcome: 'win' | 'loss';
  };
  score_persist_failed: CommonGameProperties & {
    operation: 'load' | 'save' | 'migration';
    error_category: 'storage';
  };
  progress_persist_failed: CommonGameProperties & {
    operation: 'load' | 'save' | 'clear';
    error_category: 'storage' | 'parse_or_validation';
  };
  card_image_load_failed: CommonGameProperties & {
    has_image_url: true;
  };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export const ANALYTICS_EVENT_NAMES: ReadonlySet<string> = new Set<AnalyticsEventName>([
  'analytics_consent_changed',
  'app_opened',
  'landing_viewed',
  'app_ready',
  'screen_viewed',
  'game_selected',
  'run_started',
  'run_completed',
  'label_round_passed',
  'guess_submitted',
  'round_resolved',
  'word_submitted',
  'level_completed',
  'level_failed',
  'daily_puzzle_viewed',
  'game_over_action',
  'result_shared',
  'scores_viewed',
  'auth_prompt_viewed',
  'auth_submitted',
  'auth_succeeded',
  'auth_failed',
  'auth_skipped',
  'auth_session_restored',
  'signed_out',
  'team_created',
  'team_joined',
  'team_renamed',
  'team_left',
  'team_disbanded',
  'match_created',
  'match_started',
  'match_finished',
  'score_persist_failed',
  'progress_persist_failed',
  'card_image_load_failed',
]);

export function streakBucket(streak: number): '0_4' | '5_9' | '10_19' | '20_plus' {
  if (streak >= 20) return '20_plus';
  if (streak >= 10) return '10_19';
  if (streak >= 5) return '5_9';
  return '0_4';
}

export function runCountBucket(totalRuns: number): '0' | '1_2' | '3_9' | '10_plus' {
  if (totalRuns >= 10) return '10_plus';
  if (totalRuns >= 3) return '3_9';
  if (totalRuns >= 1) return '1_2';
  return '0';
}

export function rankBucket(
  rank: number | null,
): 'win' | 'top_10' | 'top_100' | 'cold' | 'unranked' {
  if (rank === null) return 'unranked';
  if (rank === 1) return 'win';
  if (rank <= 10) return 'top_10';
  if (rank <= 100) return 'top_100';
  return 'cold';
}

export function wordLengthBucket(length: number): 'under_3' | '3_4' | '5_7' | '8_plus' {
  if (length >= 8) return '8_plus';
  if (length >= 5) return '5_7';
  if (length >= 3) return '3_4';
  return 'under_3';
}

export function scoreDeltaBucket(score: number): '0' | '1_49' | '50_149' | '150_plus' {
  if (score >= 150) return '150_plus';
  if (score >= 50) return '50_149';
  if (score >= 1) return '1_49';
  return '0';
}

export function chainLengthBucket(chain: number): '0' | '1' | '2_3' | '4_plus' {
  if (chain >= 4) return '4_plus';
  if (chain >= 2) return '2_3';
  if (chain === 1) return '1';
  return '0';
}

export function authErrorCategory(
  message: string,
): 'credentials' | 'network' | 'rate_limit' | 'unconfirmed' | 'other' {
  const normalized = message.toLowerCase();
  if (normalized.includes('network') || normalized.includes('connect')) return 'network';
  if (normalized.includes('rate') || normalized.includes('too many')) return 'rate_limit';
  if (normalized.includes('confirm') || normalized.includes('verified')) return 'unconfirmed';
  if (
    normalized.includes('password') ||
    normalized.includes('credential') ||
    normalized.includes('email') ||
    normalized.includes('username') ||
    normalized.includes('otp')
  ) {
    return 'credentials';
  }
  return 'other';
}
