export type UserRole = 'player' | 'organizer' | 'admin';
export type TournamentStatus = 'pending' | 'approved' | 'rejected' | 'featured';
export type TimeControlType = 'classical' | 'rapid' | 'blitz' | 'bullet';

export interface District {
  id: string;
  name: string;
  region: string | null;
  coordinator_name: string | null;
  coordinator_email: string | null;
  coordinator_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  district_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  district?: District;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  date: string;
  end_date: string | null;
  start_time: string | null;
  venue: string;
  venue_address: string | null;
  maps_link: string | null;
  time_control: TimeControlType;
  time_control_detail: string | null;
  rounds: number;
  entry_fee: string | null;
  prizes: string | null;
  is_rated: boolean;
  registration_procedure: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  poster_url: string | null;
  district_id: string;
  organizer_id: string;
  status: TournamentStatus;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  district?: District;
  organizer?: User;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteContent {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

export interface TournamentMedia {
  id: string;
  tournament_id: string;
  uploaded_by: string;
  url: string;
  caption: string | null;
  media_type: 'image' | 'poster';
  created_at: string;
  uploader?: User;
  tournament?: Tournament;
}

export interface TournamentComment {
  id: string;
  tournament_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface TournamentLike {
  id: string;
  tournament_id: string;
  user_id: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// Tournament Management Types
// ============================================

export type PairingSystem = 'swiss' | 'round_robin' | 'double_round_robin';
export type RatingTypeOption = 'fide' | 'national' | 'unrated';
export type RoundStatus = 'not_started' | 'pairings_published' | 'in_progress' | 'results_published';
export type GameResult = '1-0' | '0-1' | 'draw' | 'white_forfeit' | 'black_forfeit' | 'double_forfeit' | 'bye' | 'half_bye';
export type ArbiterRole = 'director' | 'arbiter';
export type SexType = 'M' | 'F';
export type AgeCategory = 'open' | 'u8' | 'u10' | 'u12' | 'u14' | 'u16' | 'u18';

export type TiebreakMethod =
  | 'buchholz'
  | 'buchholz_cut1'
  | 'median_buchholz'
  | 'sonneborn_berger'
  | 'progressive'
  | 'direct_encounter'
  | 'aro'
  | 'num_wins'
  | 'num_blacks';

export const TIEBREAK_LABELS: Record<TiebreakMethod, string> = {
  buchholz: 'Buchholz',
  buchholz_cut1: 'Buchholz Cut 1',
  median_buchholz: 'Median Buchholz',
  sonneborn_berger: 'Sonneborn-Berger',
  progressive: 'Progressive (Cumulative)',
  direct_encounter: 'Direct Encounter',
  aro: 'Average Rating of Opponents',
  num_wins: 'Number of Wins',
  num_blacks: 'Number of Games with Black',
};

export interface TournamentSettings {
  id: string;
  tournament_id: string;
  pairing_system: PairingSystem;
  num_rounds: number;
  point_win: number;
  point_draw: number;
  point_loss: number;
  point_bye: number;
  point_half_bye: number;
  tiebreak_order: TiebreakMethod[];
  rating_type: RatingTypeOption;
  allow_self_registration: boolean;
  created_at: string;
  updated_at: string;
}

export interface TournamentSection {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface TournamentArbiter {
  id: string;
  tournament_id: string;
  user_id: string;
  role: ArbiterRole;
  appointed_at: string;
  user?: User;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  section_id: string | null;
  user_id: string | null;
  player_name: string;
  fide_id: string | null;
  chess_sa_id: string | null;
  fide_rating: number | null;
  national_rating: number | null;
  club: string | null;
  district: string | null;
  sex: SexType | null;
  age_category: AgeCategory;
  starting_rank: number | null;
  is_withdrawn: boolean;
  withdrawn_after_round: number | null;
  bye_requested_rounds: number[];
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  section?: TournamentSection;
}

export interface TournamentRound {
  id: string;
  tournament_id: string;
  round_number: number;
  status: RoundStatus;
  created_at: string;
  published_at: string | null;
  pairings?: TournamentPairing[];
}

export interface TournamentPairing {
  id: string;
  round_id: string;
  board_number: number;
  white_player_id: string;
  black_player_id: string | null;
  result: GameResult | null;
  is_bye: boolean;
  is_forfeit: boolean;
  created_at: string;
  updated_at: string;
  white_player?: TournamentPlayer;
  black_player?: TournamentPlayer;
}

// Computed types for standings
export interface PlayerStanding {
  player: TournamentPlayer;
  rank: number;
  points: number;
  tiebreaks: Record<TiebreakMethod, number>;
  games: PlayerGame[];
  roundScores: number[]; // cumulative score after each round
}

export interface PlayerGame {
  round_number: number;
  opponent_id: string | null;
  opponent_name: string | null;
  opponent_rating: number | null;
  color: 'W' | 'B' | null;
  result: GameResult | null;
  points: number;
  board_number: number;
}

// For the crosstable
export interface CrosstableEntry {
  player: TournamentPlayer;
  rank: number;
  points: number;
  results: Record<string, { result: string; round: number }>; // key = opponent player id
}
