-- Real KZN tournaments — sourced from public records, not fabricated.
-- Idempotent (skips rows whose name already exists). Requires the 11 districts
-- (seed_districts.sql) and at least one admin user to exist first.
--
-- Sources:
--   2026 KZN Open ............ chess-results.com tnr1404062; FIDE event 478078
--                             (Durban Chess Club: durbanchessclub.co.za)
--   2026 DCC Championships ... durbanchessclub.co.za
--   2026 KZN Closed .......... chess-results.com tnr1442360
--
-- These are listed as `approved` only. They are intentionally NOT `featured`
-- or `is_verified` — those badges are reserved for events the association
-- actually endorses on this platform.
--
-- Site copy: the `about` and `hero` site_content entries were also updated with
-- accurate KZN chess history (first Natal championship 1956; Natal Open annual
-- since 1967; KZN Chess Association took over from Durban Chess Club in 2017).
--
-- Gallery: two CC0 1.0 illustrative chess images (Wikimedia Commons —
-- "Uzchess Cup 2025 chess tournament" and "Chess tournament in Ankara High
-- Speed Train Station") were uploaded to Supabase Storage and attached to the
-- KZN Open, captioned as illustrative (not photos of the event). Replace with
-- real organiser photos when available.

INSERT INTO tournaments
  (name, description, date, end_date, venue, venue_address, time_control,
   time_control_detail, rounds, is_rated, contact_name, district_id,
   organizer_id, status, is_verified)
SELECT
  '2026 KZN Open Chess Championships',
  'KwaZulu-Natal''s flagship open tournament, held at the Yellowwood Park Civic Hall in Durban. The 2026 edition drew close to 300 players across four sections (A, B, C and D) - a record turnout - with Sections A and B FIDE-rated. Section A ended with Michael Simpson and Keith Khumalo tied on points, Simpson taking the title on direct-encounter tiebreak. The KZN Open has run annually since 1967 and has been FIDE-rated since the KZN Chess Association took over its organisation in 2017. Source: chess-results.com (tnr1404062); FIDE event 478078.',
  '2026-05-01', '2026-05-03', 'Yellowwood Park Civic Hall', 'Yellowwood Park, Durban',
  'classical', '60 min + 30 sec increment', 7, true, 'KwaZulu-Natal Chess Association',
  (SELECT id FROM districts WHERE name = 'eThekwini'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  'approved', false
WHERE NOT EXISTS (SELECT 1 FROM tournaments WHERE name = '2026 KZN Open Chess Championships');

INSERT INTO tournaments
  (name, description, date, end_date, venue, venue_address, time_control,
   time_control_detail, rounds, is_rated, contact_name, district_id,
   organizer_id, status, is_verified)
SELECT
  '2026 Durban Chess Club Championships',
  'The annual club championship of the Durban Chess Club, played over nine rounds from 16 April to 11 June 2026. Thapelo Matsaung and Lubanzi Makaula tied for first place, each scoring 7.5. The Durban Chess Club ran the provincial championships for fifty years before the KZN Chess Association took over in 2017. Source: Durban Chess Club (durbanchessclub.co.za).',
  '2026-04-16', '2026-06-11', 'Durban Chess Club', 'Durban',
  'classical', NULL, 9, false, 'Durban Chess Club',
  (SELECT id FROM districts WHERE name = 'eThekwini'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  'approved', false
WHERE NOT EXISTS (SELECT 1 FROM tournaments WHERE name = '2026 Durban Chess Club Championships');

INSERT INTO tournaments
  (name, description, date, end_date, venue, venue_address, time_control,
   time_control_detail, rounds, is_rated, contact_name, district_id,
   organizer_id, status, is_verified)
SELECT
  '2026 KwaZulu-Natal Closed Championship',
  'The provincial closed championship, organised by the KwaZulu-Natal Chess Association at the DUT Sports Centre in Durban on 27-28 June 2026. A five-round Swiss event with a 60 minutes + 5 seconds-per-move time control. The Closed title goes to the highest-placed KZN-domiciled player. Chief arbiter: FA Keith Rust. Source: chess-results.com (tnr1442360).',
  '2026-06-27', '2026-06-28', 'DUT Sports Centre', 'Durban University of Technology, Durban',
  'classical', '60 min + 5 sec per move', 5, false, 'KwaZulu-Natal Chess Association',
  (SELECT id FROM districts WHERE name = 'eThekwini'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1),
  'approved', false
WHERE NOT EXISTS (SELECT 1 FROM tournaments WHERE name = '2026 KwaZulu-Natal Closed Championship');
