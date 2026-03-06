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
