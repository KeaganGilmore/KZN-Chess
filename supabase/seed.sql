-- KZN Chess Tournament Hub - Seed Data

-- ============================================
-- SEED DISTRICTS (All 11 KZN Districts)
-- ============================================
INSERT INTO districts (id, name, region, coordinator_name, coordinator_email, coordinator_phone) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'eThekwini', 'Durban Metro', 'Sipho Ndlovu', 'ethekwini@kznchess.co.za', '+27 31 000 0001'),
  ('d1000000-0000-0000-0000-000000000002', 'uMgungundlavu', 'Pietermaritzburg', 'Thandi Mkhize', 'umgungundlavu@kznchess.co.za', '+27 33 000 0002'),
  ('d1000000-0000-0000-0000-000000000003', 'Ugu', 'South Coast', 'James van der Berg', 'ugu@kznchess.co.za', '+27 39 000 0003'),
  ('d1000000-0000-0000-0000-000000000004', 'King Cetshwayo', 'Richards Bay', 'Nomusa Zulu', 'kingcetshwayo@kznchess.co.za', '+27 35 000 0004'),
  ('d1000000-0000-0000-0000-000000000005', 'Zululand', 'Ulundi', 'Bongani Dlamini', 'zululand@kznchess.co.za', '+27 35 000 0005'),
  ('d1000000-0000-0000-0000-000000000006', 'Harry Gwala', 'Ixopo', 'Sarah Pillay', 'harrygwala@kznchess.co.za', '+27 39 000 0006'),
  ('d1000000-0000-0000-0000-000000000007', 'uMkhanyakude', 'Mkuze', 'David Nkosi', 'umkhanyakude@kznchess.co.za', '+27 35 000 0007'),
  ('d1000000-0000-0000-0000-000000000008', 'uThukela', 'Ladysmith', 'Priya Govender', 'uthukela@kznchess.co.za', '+27 36 000 0008'),
  ('d1000000-0000-0000-0000-000000000009', 'Amajuba', 'Newcastle', 'John Botha', 'amajuba@kznchess.co.za', '+27 34 000 0009'),
  ('d1000000-0000-0000-0000-000000000010', 'iLembe', 'KwaDukuza', 'Zanele Mthembu', 'ilembe@kznchess.co.za', '+27 32 000 0010'),
  ('d1000000-0000-0000-0000-000000000011', 'uMzinyathi', 'Dundee', 'Raj Maharaj', 'umzinyathi@kznchess.co.za', '+27 34 000 0011');

-- ============================================
-- SEED USERS (Admin + 3 Organizers + 2 Players)
-- ============================================
-- Note: passwords are bcrypt hashes of 'password123' - change in production
INSERT INTO users (id, email, name, password_hash, role, district_id) VALUES
  ('u1000000-0000-0000-0000-000000000001', 'admin@kznchess.co.za', 'KZN Chess Admin', '$2b$10$dummyhashfordevpurposes000000000000000000000000', 'admin', 'd1000000-0000-0000-0000-000000000001'),
  ('u1000000-0000-0000-0000-000000000002', 'organizer1@kznchess.co.za', 'Sipho Ndlovu', '$2b$10$dummyhashfordevpurposes000000000000000000000000', 'organizer', 'd1000000-0000-0000-0000-000000000001'),
  ('u1000000-0000-0000-0000-000000000003', 'organizer2@kznchess.co.za', 'Thandi Mkhize', '$2b$10$dummyhashfordevpurposes000000000000000000000000', 'organizer', 'd1000000-0000-0000-0000-000000000002'),
  ('u1000000-0000-0000-0000-000000000004', 'organizer3@kznchess.co.za', 'James van der Berg', '$2b$10$dummyhashfordevpurposes000000000000000000000000', 'organizer', 'd1000000-0000-0000-0000-000000000003'),
  ('u1000000-0000-0000-0000-000000000005', 'player1@kznchess.co.za', 'Nomusa Zulu', '$2b$10$dummyhashfordevpurposes000000000000000000000000', 'player', 'd1000000-0000-0000-0000-000000000004'),
  ('u1000000-0000-0000-0000-000000000006', 'player2@kznchess.co.za', 'David Nkosi', '$2b$10$dummyhashfordevpurposes000000000000000000000000', 'player', 'd1000000-0000-0000-0000-000000000005');

-- ============================================
-- SEED TOURNAMENTS (8 across different districts)
-- ============================================
INSERT INTO tournaments (id, name, description, date, end_date, start_time, venue, venue_address, maps_link, time_control, time_control_detail, rounds, entry_fee, prizes, is_rated, registration_procedure, contact_name, contact_phone, contact_email, poster_url, district_id, organizer_id, status, is_verified) VALUES
  (
    't1000000-0000-0000-0000-000000000001',
    'Durban Open Chess Championship 2026',
    'The premier chess event in KwaZulu-Natal. Open to all rated and unrated players. Prizes for top finishers and best junior.',
    '2026-04-15', '2026-04-16', '09:00',
    'Durban ICC', '45 Bram Fischer Road, Durban, 4001',
    'https://maps.google.com/?q=Durban+ICC',
    'classical', '90min + 30sec increment',
    7, 'R200 (Juniors R100)', 'R10,000 first prize, R5,000 second, R3,000 third',
    true, 'Register via email or WhatsApp. Payment confirms entry.',
    'Sipho Ndlovu', '+27 82 000 0001', 'sipho@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000002',
    'featured', true
  ),
  (
    't1000000-0000-0000-0000-000000000002',
    'PMB Rapid Chess Festival',
    'A one-day rapid chess festival in the heart of Pietermaritzburg. Fun, competitive, and open to all skill levels.',
    '2026-03-22', NULL, '10:00',
    'Pietermaritzburg City Hall', 'Chief Albert Luthuli St, Pietermaritzburg, 3201',
    'https://maps.google.com/?q=Pietermaritzburg+City+Hall',
    'rapid', '15min + 10sec increment',
    6, 'R100', 'Trophies and cash prizes',
    true, 'Walk-in registration accepted. Pre-register via WhatsApp for guaranteed spot.',
    'Thandi Mkhize', '+27 82 000 0002', 'thandi@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000002', 'u1000000-0000-0000-0000-000000000003',
    'approved', true
  ),
  (
    't1000000-0000-0000-0000-000000000003',
    'South Coast Junior Championships',
    'Annual junior chess championship for players under 18. Sections for U8, U10, U12, U14, U16, and U18.',
    '2026-05-10', NULL, '08:30',
    'Port Shepstone Civic Centre', 'Bisset St, Port Shepstone, 4240',
    'https://maps.google.com/?q=Port+Shepstone+Civic+Centre',
    'rapid', '25min + 5sec increment',
    5, 'R80', 'Medals and trophies per section',
    true, 'Schools register teams via email. Individual entries via WhatsApp.',
    'James van der Berg', '+27 82 000 0003', 'james@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000003', 'u1000000-0000-0000-0000-000000000004',
    'approved', false
  ),
  (
    't1000000-0000-0000-0000-000000000004',
    'Richards Bay Blitz Night',
    'Weekly blitz chess evening. Casual and fun atmosphere. All welcome!',
    '2026-03-14', NULL, '18:00',
    'Bay Lodge', '1 Hibberd Drive, Richards Bay, 3900',
    'https://maps.google.com/?q=Bay+Lodge+Richards+Bay',
    'blitz', '3min + 2sec increment',
    9, 'R50', 'Winner takes pool',
    false, 'Just show up and play!',
    'Nomusa Zulu', '+27 82 000 0004', 'nomusa@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000004', 'u1000000-0000-0000-0000-000000000002',
    'approved', false
  ),
  (
    't1000000-0000-0000-0000-000000000005',
    'Zululand Open 2026',
    'The biggest chess event in northern KZN. Attracting players from across the province.',
    '2026-06-20', '2026-06-21', '09:00',
    'Ulundi Community Hall', 'King Dinuzulu Hwy, Ulundi, 3838',
    'https://maps.google.com/?q=Ulundi+Community+Hall',
    'classical', '60min + 30sec increment',
    6, 'R150', 'R5,000 first prize',
    true, 'Pre-registration required. Email or WhatsApp to enter.',
    'Bongani Dlamini', '+27 82 000 0005', 'bongani@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000005', 'u1000000-0000-0000-0000-000000000002',
    'approved', true
  ),
  (
    't1000000-0000-0000-0000-000000000006',
    'Ladysmith Chess Club Monthly',
    'Monthly rated tournament hosted by the Ladysmith Chess Club.',
    '2026-04-05', NULL, '09:00',
    'Ladysmith Town Hall', 'Murchison St, Ladysmith, 3370',
    'https://maps.google.com/?q=Ladysmith+Town+Hall',
    'rapid', '20min + 5sec increment',
    5, 'R60', 'Trophies',
    true, 'Contact Priya to register.',
    'Priya Govender', '+27 82 000 0008', 'priya@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000008', 'u1000000-0000-0000-0000-000000000003',
    'approved', false
  ),
  (
    't1000000-0000-0000-0000-000000000007',
    'Newcastle Inter-Schools Chess League',
    'Semester league for schools in the Amajuba district. Teams of 4 per school.',
    '2026-03-28', '2026-06-30', '14:00',
    'Newcastle High School', 'Scott St, Newcastle, 2940',
    'https://maps.google.com/?q=Newcastle+High+School',
    'rapid', '15min + 10sec increment',
    4, 'Free', 'Floating trophy',
    false, 'Schools register teams via the district coordinator.',
    'John Botha', '+27 82 000 0009', 'john@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000009', 'u1000000-0000-0000-0000-000000000004',
    'approved', false
  ),
  (
    't1000000-0000-0000-0000-000000000008',
    'iLembe Beginners Workshop & Tournament',
    'Chess workshop for beginners followed by a friendly tournament. Perfect for those just starting out.',
    '2026-04-12', NULL, '10:00',
    'KwaDukuza Library Hall', 'King Shaka St, KwaDukuza, 4450',
    'https://maps.google.com/?q=KwaDukuza+Library+Hall',
    'rapid', '10min per player',
    5, 'Free', 'Participation certificates',
    false, 'Open to all beginners. Walk-ins welcome.',
    'Zanele Mthembu', '+27 82 000 0010', 'zanele@kznchess.co.za', NULL,
    'd1000000-0000-0000-0000-000000000010', 'u1000000-0000-0000-0000-000000000004',
    'pending', false
  );

-- ============================================
-- SEED SITE CONTENT
-- ============================================
INSERT INTO site_content (key, value) VALUES
  ('hero', '{"title": "KwaZulu-Natal Chess", "subtitle": "Every Tournament, One Place", "description": "The central hub for all chess tournaments across KwaZulu-Natal. Find events, register, and grow the chess community."}'),
  ('stats', '{"districts": 11, "tournaments_hosted": 156, "players_registered": 2400}'),
  ('about', '{"content": "<h2>About KZN Chess</h2><p>KZN Chess is the central platform for all chess tournaments across KwaZulu-Natal, South Africa. We connect players, organizers, and districts to grow the chess community across the province.</p><p>Our platform makes it easy for tournament organizers to promote their events and for players to find tournaments in their area. Whether you are a seasoned competitor or a beginner looking for your first tournament, KZN Chess has something for you.</p><h3>Our Districts</h3><p>KwaZulu-Natal is divided into 11 districts, each with its own chess community and coordinator. From the bustling eThekwini metro to the rural areas of uMkhanyakude, chess is thriving across the province.</p><h3>How It Works</h3><p>Tournament organizers submit their events through our platform. Once approved by our admin team, tournaments appear on the public calendar for all players to see. Players can browse by district, date, or type to find the perfect event.</p>"}'),
  ('announcement', '{"text": "Registrations open for the 2026 KZN Provincial Championships! Visit the Durban Open page for details.", "is_active": true, "start_date": "2026-03-01", "end_date": "2026-04-15"}');
