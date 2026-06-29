-- Production-safe seed: the 11 real districts of KwaZulu-Natal only.
-- Idempotent (ON CONFLICT on the unique district name). Inserts no sample
-- users or tournaments, and leaves coordinator contacts blank to be filled in
-- from the admin panel. Safe to run against production.

INSERT INTO districts (name, region) VALUES
  ('eThekwini', 'Durban Metro'),
  ('uMgungundlovu', 'Pietermaritzburg'),
  ('Ugu', 'South Coast'),
  ('King Cetshwayo', 'Richards Bay'),
  ('Zululand', 'Ulundi'),
  ('Harry Gwala', 'Ixopo'),
  ('uMkhanyakude', 'Mkuze'),
  ('uThukela', 'Ladysmith'),
  ('Amajuba', 'Newcastle'),
  ('iLembe', 'KwaDukuza'),
  ('uMzinyathi', 'Dundee')
ON CONFLICT (name) DO NOTHING;
