-- KZN Chess Tournament Hub - Seed Data
-- Full seed with all fields populated
-- WARNING: This truncates all tables before seeding!

-- Clear existing data (order matters due to foreign keys)
TRUNCATE tournament_likes, tournament_comments, tournament_media, audit_logs, tournaments, announcements, site_content, users, districts CASCADE;

-- ============================================
-- SEED DISTRICTS (All 11 KZN Districts)
-- UUID pattern: aa000000-0000-0000-0000-0000000000XX
-- ============================================
INSERT INTO districts (id, name, region, coordinator_name, coordinator_email, coordinator_phone) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'eThekwini', 'Durban Metro', 'Sipho Ndlovu', 'ethekwini@kznchess.co.za', '+27 31 000 0001'),
  ('aa000000-0000-0000-0000-000000000002', 'uMgungundlavu', 'Pietermaritzburg', 'Thandi Mkhize', 'umgungundlavu@kznchess.co.za', '+27 33 000 0002'),
  ('aa000000-0000-0000-0000-000000000003', 'Ugu', 'South Coast', 'James van der Berg', 'ugu@kznchess.co.za', '+27 39 000 0003'),
  ('aa000000-0000-0000-0000-000000000004', 'King Cetshwayo', 'Richards Bay', 'Nomusa Zulu', 'kingcetshwayo@kznchess.co.za', '+27 35 000 0004'),
  ('aa000000-0000-0000-0000-000000000005', 'Zululand', 'Ulundi', 'Bongani Dlamini', 'zululand@kznchess.co.za', '+27 35 000 0005'),
  ('aa000000-0000-0000-0000-000000000006', 'Harry Gwala', 'Ixopo', 'Sarah Pillay', 'harrygwala@kznchess.co.za', '+27 39 000 0006'),
  ('aa000000-0000-0000-0000-000000000007', 'uMkhanyakude', 'Mkuze', 'David Nkosi', 'umkhanyakude@kznchess.co.za', '+27 35 000 0007'),
  ('aa000000-0000-0000-0000-000000000008', 'uThukela', 'Ladysmith', 'Priya Govender', 'uthukela@kznchess.co.za', '+27 36 000 0008'),
  ('aa000000-0000-0000-0000-000000000009', 'Amajuba', 'Newcastle', 'John Botha', 'amajuba@kznchess.co.za', '+27 34 000 0009'),
  ('aa000000-0000-0000-0000-000000000010', 'iLembe', 'KwaDukuza', 'Zanele Mthembu', 'ilembe@kznchess.co.za', '+27 32 000 0010'),
  ('aa000000-0000-0000-0000-000000000011', 'uMzinyathi', 'Dundee', 'Raj Maharaj', 'umzinyathi@kznchess.co.za', '+27 34 000 0011');

-- ============================================
-- SEED USERS (Admin + 3 Organizers + 2 Players)
-- UUID pattern: bb000000-0000-0000-0000-0000000000XX
-- ============================================
INSERT INTO users (id, email, name, password_hash, role, district_id) VALUES
  ('bb000000-0000-0000-0000-000000000001', 'admin@kznchess.co.za', 'KZN Chess Admin', '$2b$10$rF00gALVYOIMmLarWc8xHezaxB379rtgWGseOkfdiubnFZKSWaQxW', 'admin', 'aa000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-000000000002', 'organizer1@kznchess.co.za', 'Sipho Ndlovu', '$2b$10$rF00gALVYOIMmLarWc8xHezaxB379rtgWGseOkfdiubnFZKSWaQxW', 'organizer', 'aa000000-0000-0000-0000-000000000001'),
  ('bb000000-0000-0000-0000-000000000003', 'organizer2@kznchess.co.za', 'Thandi Mkhize', '$2b$10$rF00gALVYOIMmLarWc8xHezaxB379rtgWGseOkfdiubnFZKSWaQxW', 'organizer', 'aa000000-0000-0000-0000-000000000002'),
  ('bb000000-0000-0000-0000-000000000004', 'organizer3@kznchess.co.za', 'James van der Berg', '$2b$10$rF00gALVYOIMmLarWc8xHezaxB379rtgWGseOkfdiubnFZKSWaQxW', 'organizer', 'aa000000-0000-0000-0000-000000000003'),
  ('bb000000-0000-0000-0000-000000000005', 'player1@kznchess.co.za', 'Nomusa Zulu', '$2b$10$rF00gALVYOIMmLarWc8xHezaxB379rtgWGseOkfdiubnFZKSWaQxW', 'player', 'aa000000-0000-0000-0000-000000000004'),
  ('bb000000-0000-0000-0000-000000000006', 'player2@kznchess.co.za', 'David Nkosi', '$2b$10$rF00gALVYOIMmLarWc8xHezaxB379rtgWGseOkfdiubnFZKSWaQxW', 'player', 'aa000000-0000-0000-0000-000000000005');

-- ============================================
-- SEED TOURNAMENTS (12 total: 8 upcoming + 4 past/completed)
-- UUID pattern: cc000000-0000-0000-0000-0000000000XX
-- ============================================
INSERT INTO tournaments (id, name, description, date, end_date, start_time, venue, venue_address, maps_link, time_control, time_control_detail, rounds, entry_fee, prizes, is_rated, registration_procedure, contact_name, contact_phone, contact_email, poster_url, district_id, organizer_id, status, is_verified) VALUES
  (
    'cc000000-0000-0000-0000-000000000001',
    'Durban Open Chess Championship 2026',
    'The premier chess event in KwaZulu-Natal. Open to all rated and unrated players. Prizes for top finishers and best junior. This is the flagship event of the KZN chess calendar, drawing competitors from across the province and beyond. Sections include Open, U1800, U1400, and Juniors.',
    '2026-04-15', '2026-04-16', '09:00',
    'Durban ICC', '45 Bram Fischer Road, Durban, 4001',
    'https://maps.google.com/?q=Durban+ICC',
    'classical', '90min + 30sec increment',
    7, 'R200 (Juniors R100)', 'R10,000 first prize, R5,000 second, R3,000 third. Best Junior R1,500.',
    true, 'Register via email or WhatsApp. Payment confirms entry. EFT details sent on registration.',
    'Sipho Ndlovu', '+27 82 000 0001', 'sipho@kznchess.co.za',
    'https://picsum.photos/seed/durban-open/1200/600',
    'aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000002',
    'featured', true
  ),
  (
    'cc000000-0000-0000-0000-000000000002',
    'PMB Rapid Chess Festival',
    'A one-day rapid chess festival in the heart of Pietermaritzburg. Fun, competitive, and open to all skill levels. Light refreshments provided. Bring your own chess set if possible.',
    '2026-03-22', NULL, '10:00',
    'Pietermaritzburg City Hall', 'Chief Albert Luthuli St, Pietermaritzburg, 3201',
    'https://maps.google.com/?q=Pietermaritzburg+City+Hall',
    'rapid', '15min + 10sec increment',
    6, 'R100', 'Trophies and cash prizes. R3,000 first, R1,500 second.',
    true, 'Walk-in registration accepted. Pre-register via WhatsApp for guaranteed spot.',
    'Thandi Mkhize', '+27 82 000 0002', 'thandi@kznchess.co.za',
    'https://picsum.photos/seed/pmb-rapid/1200/600',
    'aa000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000003',
    'approved', true
  ),
  (
    'cc000000-0000-0000-0000-000000000003',
    'South Coast Junior Championships',
    'Annual junior chess championship for players under 18. Sections for U8, U10, U12, U14, U16, and U18. Each section plays 5 rounds Swiss. Parents welcome to spectate. Canteen available on site.',
    '2026-05-10', NULL, '08:30',
    'Port Shepstone Civic Centre', 'Bisset St, Port Shepstone, 4240',
    'https://maps.google.com/?q=Port+Shepstone+Civic+Centre',
    'rapid', '25min + 5sec increment',
    5, 'R80', 'Medals for top 3 per section. Floating trophy for best school.',
    true, 'Schools register teams via email. Individual entries via WhatsApp.',
    'James van der Berg', '+27 82 000 0003', 'james@kznchess.co.za',
    'https://picsum.photos/seed/south-coast-juniors/1200/600',
    'aa000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000004',
    'approved', false
  ),
  (
    'cc000000-0000-0000-0000-000000000004',
    'Richards Bay Blitz Night',
    'Weekly blitz chess evening. Casual and fun atmosphere. All welcome! Come test your speed chess skills against the best in King Cetshwayo district. Pizza and drinks available.',
    '2026-03-14', NULL, '18:00',
    'Bay Lodge', '1 Hibberd Drive, Richards Bay, 3900',
    'https://maps.google.com/?q=Bay+Lodge+Richards+Bay',
    'blitz', '3min + 2sec increment',
    9, 'R50', 'Winner takes pool',
    false, 'Just show up and play! Registration from 17:30.',
    'Nomusa Zulu', '+27 82 000 0004', 'nomusa@kznchess.co.za',
    'https://picsum.photos/seed/richards-bay-blitz/1200/600',
    'aa000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000002',
    'approved', false
  ),
  (
    'cc000000-0000-0000-0000-000000000005',
    'Zululand Open 2026',
    'The biggest chess event in northern KZN. Attracting players from across the province. Two-day classical tournament with beautiful views of the Zululand hills. Accommodation recommendations available on request.',
    '2026-06-20', '2026-06-21', '09:00',
    'Ulundi Community Hall', 'King Dinuzulu Hwy, Ulundi, 3838',
    'https://maps.google.com/?q=Ulundi+Community+Hall',
    'classical', '60min + 30sec increment',
    6, 'R150', 'R5,000 first prize. R2,500 second. R1,000 third.',
    true, 'Pre-registration required. Email or WhatsApp to enter. Limited to 60 players.',
    'Bongani Dlamini', '+27 82 000 0005', 'bongani@kznchess.co.za',
    'https://picsum.photos/seed/zululand-open/1200/600',
    'aa000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000002',
    'approved', true
  ),
  (
    'cc000000-0000-0000-0000-000000000006',
    'Ladysmith Chess Club Monthly',
    'Monthly rated tournament hosted by the Ladysmith Chess Club. Friendly atmosphere with strong competition. Tea and coffee provided. Come join our growing chess community in the uThukela district!',
    '2026-04-05', NULL, '09:00',
    'Ladysmith Town Hall', 'Murchison St, Ladysmith, 3370',
    'https://maps.google.com/?q=Ladysmith+Town+Hall',
    'rapid', '20min + 5sec increment',
    5, 'R60', 'Trophies for top 3. Best newcomer prize.',
    true, 'Contact Priya to register. WhatsApp preferred.',
    'Priya Govender', '+27 82 000 0008', 'priya@kznchess.co.za',
    'https://picsum.photos/seed/ladysmith-monthly/1200/600',
    'aa000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000003',
    'approved', false
  ),
  (
    'cc000000-0000-0000-0000-000000000007',
    'Newcastle Inter-Schools Chess League',
    'Semester league for schools in the Amajuba district. Teams of 4 per school. Matches played fortnightly at rotating venues. Great opportunity for young players to gain competitive experience.',
    '2026-03-28', '2026-06-30', '14:00',
    'Newcastle High School', 'Scott St, Newcastle, 2940',
    'https://maps.google.com/?q=Newcastle+High+School',
    'rapid', '15min + 10sec increment',
    4, 'Free', 'Floating trophy and individual medals',
    false, 'Schools register teams via the district coordinator. Max 2 teams per school.',
    'John Botha', '+27 82 000 0009', 'john@kznchess.co.za',
    'https://picsum.photos/seed/newcastle-schools/1200/600',
    'aa000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000004',
    'approved', false
  ),
  (
    'cc000000-0000-0000-0000-000000000008',
    'iLembe Beginners Workshop & Tournament',
    'Chess workshop for beginners followed by a friendly tournament. Perfect for those just starting out. Learn the rules, basic tactics, and then put your skills to the test! Boards and pieces provided.',
    '2026-04-12', NULL, '10:00',
    'KwaDukuza Library Hall', 'King Shaka St, KwaDukuza, 4450',
    'https://maps.google.com/?q=KwaDukuza+Library+Hall',
    'rapid', '10min per player',
    5, 'Free', 'Participation certificates and chess sets for top 3',
    false, 'Open to all beginners. Walk-ins welcome. Ages 8+.',
    'Zanele Mthembu', '+27 82 000 0010', 'zanele@kznchess.co.za',
    'https://picsum.photos/seed/ilembe-beginners/1200/600',
    'aa000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000004',
    'pending', false
  ),
  -- Past completed tournaments for archive/gallery
  (
    'cc000000-0000-0000-0000-000000000009',
    'KZN Provincial Championships 2025',
    'The 2025 KZN Provincial Chess Championships. A historic event that crowned our provincial champion. 48 players competed over two intense days of classical chess.',
    '2025-11-15', '2025-11-16', '09:00',
    'Durban ICC', '45 Bram Fischer Road, Durban, 4001',
    'https://maps.google.com/?q=Durban+ICC',
    'classical', '90min + 30sec increment',
    7, 'R250', 'R15,000 first prize',
    true, 'Registration closed.',
    'Sipho Ndlovu', '+27 82 000 0001', 'sipho@kznchess.co.za',
    'https://picsum.photos/seed/kzn-provincials-2025/1200/600',
    'aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000002',
    'featured', true
  ),
  (
    'cc000000-0000-0000-0000-000000000010',
    'PMB Winter Blitz 2025',
    'A cold winter evening warmed up by hot chess action! 32 players battled it out in this popular blitz event at the Royal Hotel.',
    '2025-07-12', NULL, '18:00',
    'Royal Hotel Pietermaritzburg', 'Loop St, Pietermaritzburg, 3201',
    'https://maps.google.com/?q=Royal+Hotel+Pietermaritzburg',
    'blitz', '5min + 3sec increment',
    11, 'R80', 'R2,000 first prize',
    true, 'Registration closed.',
    'Thandi Mkhize', '+27 82 000 0002', 'thandi@kznchess.co.za',
    'https://picsum.photos/seed/pmb-winter-blitz/1200/600',
    'aa000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000003',
    'approved', true
  ),
  (
    'cc000000-0000-0000-0000-000000000011',
    'Ugu Youth Chess Day 2025',
    'A special youth chess event on Youth Day. Over 60 young players from schools across the South Coast came together for a day of chess and fun.',
    '2025-06-16', NULL, '09:00',
    'Margate Civic Centre', 'Marine Dr, Margate, 4275',
    'https://maps.google.com/?q=Margate+Civic+Centre',
    'rapid', '15min + 5sec increment',
    5, 'Free', 'Medals and certificates',
    false, 'Registration closed.',
    'James van der Berg', '+27 82 000 0003', 'james@kznchess.co.za',
    'https://picsum.photos/seed/ugu-youth-day/1200/600',
    'aa000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000004',
    'approved', false
  ),
  (
    'cc000000-0000-0000-0000-000000000012',
    'eThekwini Club Championship 2025',
    'The annual club championship for all registered members of the eThekwini Chess Club. A gruelling 9-round Swiss over three weekends.',
    '2025-09-06', '2025-09-21', '10:00',
    'Moses Mabhida People''s Park', 'Isaiah Ntshangase Rd, Durban, 4001',
    'https://maps.google.com/?q=Moses+Mabhida+Peoples+Park',
    'classical', '60min + 30sec increment',
    9, 'R120', 'Club champion trophy and R3,000',
    true, 'Registration closed.',
    'Sipho Ndlovu', '+27 82 000 0001', 'sipho@kznchess.co.za',
    'https://picsum.photos/seed/ethekwini-club/1200/600',
    'aa000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000002',
    'approved', true
  );

-- ============================================
-- SEED TOURNAMENT MEDIA (gallery photos for past events + posters)
-- UUID pattern: dd000000-0000-0000-0000-0000000000XX
-- ============================================
INSERT INTO tournament_media (id, tournament_id, uploaded_by, url, caption, media_type) VALUES
  ('dd000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/prov-1/800/600', 'Opening ceremony at the Durban ICC', 'image'),
  ('dd000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/prov-2/800/600', 'Round 1 in progress - packed hall', 'image'),
  ('dd000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/prov-3/800/600', 'Top boards - tense endgame action', 'image'),
  ('dd000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/prov-4/800/600', 'Prize-giving ceremony - our new provincial champion!', 'image'),
  ('dd000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/prov-5/800/600', 'Group photo of all participants', 'image'),
  ('dd000000-0000-0000-0000-000000000006', 'cc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/blitz-1/800/600', 'Setting up at the Royal Hotel', 'image'),
  ('dd000000-0000-0000-0000-000000000007', 'cc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/blitz-2/800/600', 'Blitz action - clocks ticking!', 'image'),
  ('dd000000-0000-0000-0000-000000000008', 'cc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000006', 'https://picsum.photos/seed/blitz-3/800/600', 'The final showdown for first place', 'image'),
  ('dd000000-0000-0000-0000-000000000009', 'cc000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/blitz-4/800/600', 'Winner with trophy and check', 'image'),
  ('dd000000-0000-0000-0000-000000000010', 'cc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/youth-1/800/600', 'Young players concentrating hard', 'image'),
  ('dd000000-0000-0000-0000-000000000011', 'cc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/youth-2/800/600', 'Teaching moment - coach helping a beginner', 'image'),
  ('dd000000-0000-0000-0000-000000000012', 'cc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/youth-3/800/600', 'Medal ceremony for U12 section', 'image'),
  ('dd000000-0000-0000-0000-000000000013', 'cc000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/youth-4/800/600', 'All participants with their certificates', 'image'),
  ('dd000000-0000-0000-0000-000000000014', 'cc000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/club-1/800/600', 'Round 1 at People''s Park', 'image'),
  ('dd000000-0000-0000-0000-000000000015', 'cc000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/club-2/800/600', 'Outdoor chess with a view of Moses Mabhida', 'image'),
  ('dd000000-0000-0000-0000-000000000016', 'cc000000-0000-0000-0000-000000000012', 'bb000000-0000-0000-0000-000000000006', 'https://picsum.photos/seed/club-3/800/600', 'Deciding game of the championship', 'image'),
  ('dd000000-0000-0000-0000-000000000017', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/durban-poster/800/1100', 'Official tournament poster', 'poster'),
  ('dd000000-0000-0000-0000-000000000018', 'cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/zululand-poster/800/1100', 'Zululand Open poster', 'poster');

-- ============================================
-- SEED TOURNAMENT COMMENTS
-- UUID pattern: ee000000-0000-0000-0000-0000000000XX
-- ============================================
INSERT INTO tournament_comments (id, tournament_id, user_id, content, created_at) VALUES
  ('ee000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000005', 'Can''t wait for this one! Been training all year. See you all there!', '2026-03-01 10:00:00+02'),
  ('ee000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000006', 'Is there parking at the ICC? Coming from uMzinyathi district.', '2026-03-02 14:30:00+02'),
  ('ee000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Yes! There is secure underground parking at the ICC. R30 for the day.', '2026-03-02 15:00:00+02'),
  ('ee000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Bringing a team from PMB. Looking forward to it!', '2026-03-05 09:15:00+02'),
  ('ee000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000005', 'Love the rapid format. Quick and exciting games!', '2026-03-08 11:00:00+02'),
  ('ee000000-0000-0000-0000-000000000006', 'cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000006', 'Great venue choice. City Hall has excellent facilities.', '2026-03-10 16:45:00+02'),
  ('ee000000-0000-0000-0000-000000000007', 'cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000005', 'The Zululand Open is always special. The hospitality is amazing.', '2026-03-15 08:00:00+02'),
  ('ee000000-0000-0000-0000-000000000008', 'cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000004', 'Any recommendations for accommodation near the venue?', '2026-03-18 12:30:00+02'),
  ('ee000000-0000-0000-0000-000000000009', 'cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Try the Garden Court Ulundi or any of the B&Bs on King Dinuzulu Hwy. All within 5min drive.', '2026-03-18 13:00:00+02'),
  ('ee000000-0000-0000-0000-000000000010', 'cc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000006', 'Best blitz night in KZN! The pizza makes it even better.', '2026-03-05 20:00:00+02'),
  ('ee000000-0000-0000-0000-000000000011', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000005', 'What an incredible event! Well organized and fierce competition.', '2025-11-17 10:00:00+02'),
  ('ee000000-0000-0000-0000-000000000012', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000006', 'The level of play was exceptional this year. Already looking forward to 2026!', '2025-11-17 14:00:00+02'),
  ('ee000000-0000-0000-0000-000000000013', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000001', 'Thank you to all participants and sponsors. Truly a world-class event for KZN chess.', '2025-11-18 09:00:00+02'),
  ('ee000000-0000-0000-0000-000000000014', 'cc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000006', 'This is exactly what we need - more beginner-friendly events!', '2026-03-06 11:00:00+02'),
  ('ee000000-0000-0000-0000-000000000015', 'cc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000005', 'Will there be someone teaching the rules from scratch? My kids want to learn.', '2026-03-07 08:30:00+02');

-- ============================================
-- SEED TOURNAMENT LIKES
-- UUID pattern: ff000000-0000-0000-0000-0000000000XX
-- ============================================
INSERT INTO tournament_likes (id, tournament_id, user_id) VALUES
  ('ff000000-0000-0000-0000-000000000001', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000003'),
  ('ff000000-0000-0000-0000-000000000002', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000004'),
  ('ff000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000005'),
  ('ff000000-0000-0000-0000-000000000004', 'cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000006'),
  ('ff000000-0000-0000-0000-000000000005', 'cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000005'),
  ('ff000000-0000-0000-0000-000000000006', 'cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000006'),
  ('ff000000-0000-0000-0000-000000000007', 'cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000004'),
  ('ff000000-0000-0000-0000-000000000008', 'cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000005'),
  ('ff000000-0000-0000-0000-000000000009', 'cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000003'),
  ('ff000000-0000-0000-0000-000000000010', 'cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000004'),
  ('ff000000-0000-0000-0000-000000000011', 'cc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000006'),
  ('ff000000-0000-0000-0000-000000000012', 'cc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000005'),
  ('ff000000-0000-0000-0000-000000000013', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000002'),
  ('ff000000-0000-0000-0000-000000000014', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000003'),
  ('ff000000-0000-0000-0000-000000000015', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000004'),
  ('ff000000-0000-0000-0000-000000000016', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000005'),
  ('ff000000-0000-0000-0000-000000000017', 'cc000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000006'),
  ('ff000000-0000-0000-0000-000000000018', 'cc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000004'),
  ('ff000000-0000-0000-0000-000000000019', 'cc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000005'),
  ('ff000000-0000-0000-0000-000000000020', 'cc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000005'),
  ('ff000000-0000-0000-0000-000000000021', 'cc000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000006');

-- ============================================
-- SEED SITE CONTENT
-- ============================================
INSERT INTO site_content (key, value) VALUES
  ('hero', '{"title": "KwaZulu-Natal Chess", "subtitle": "Every Tournament, One Place", "description": "The central hub for all chess tournaments across KwaZulu-Natal. Find events, register, and grow the chess community."}'),
  ('stats', '{"districts": 11, "tournaments_hosted": 156, "players_registered": 2400}'),
  ('about', '{"content": "<h2>About KZN Chess</h2><p>KZN Chess is the central platform for all chess tournaments across KwaZulu-Natal, South Africa. We connect players, organizers, and districts to grow the chess community across the province.</p><p>Our platform makes it easy for tournament organizers to promote their events and for players to find tournaments in their area. Whether you are a seasoned competitor or a beginner looking for your first tournament, KZN Chess has something for you.</p><h3>Our Districts</h3><p>KwaZulu-Natal is divided into 11 districts, each with its own chess community and coordinator. From the bustling eThekwini metro to the rural areas of uMkhanyakude, chess is thriving across the province.</p><h3>How It Works</h3><p>Anyone with an account can submit tournaments to the platform. Admin-endorsed events are prioritized and clearly marked, while community-submitted events gain credibility through likes and comments from fellow players.</p>"}'),
  ('announcement', '{"text": "Registrations open for the 2026 KZN Provincial Championships! Visit the Durban Open page for details.", "is_active": true, "start_date": "2026-03-01", "end_date": "2026-04-15"}');
