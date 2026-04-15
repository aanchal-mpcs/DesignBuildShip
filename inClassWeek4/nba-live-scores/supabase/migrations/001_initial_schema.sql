-- 1. Teams table (static, seeded with 30 NBA teams)
CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  conference TEXT NOT NULL,
  division TEXT NOT NULL
);

-- 2. Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User favorites (many-to-many join)
CREATE TABLE user_favorites (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, team_id)
);

-- 4. Games (cached from balldontlie API)
CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'final')),
  period INTEGER,
  time TEXT,
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  home_team_score INTEGER NOT NULL DEFAULT 0,
  away_team_score INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);
CREATE INDEX idx_games_date_status ON games(date, status);

-- 5. Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User favorites: users can manage their own
CREATE POLICY "Users can view own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- Games: readable by all authenticated users
CREATE POLICY "Authenticated users can view games" ON games FOR SELECT TO authenticated USING (true);

-- Teams: readable by everyone
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT USING (true);

-- 6. Enable Realtime on games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- 7. Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Seed all 30 NBA teams
INSERT INTO teams (id, name, abbreviation, city, conference, division) VALUES
  (1, 'Hawks', 'ATL', 'Atlanta', 'East', 'Southeast'),
  (2, 'Celtics', 'BOS', 'Boston', 'East', 'Atlantic'),
  (3, 'Nets', 'BKN', 'Brooklyn', 'East', 'Atlantic'),
  (4, 'Hornets', 'CHA', 'Charlotte', 'East', 'Southeast'),
  (5, 'Bulls', 'CHI', 'Chicago', 'East', 'Central'),
  (6, 'Cavaliers', 'CLE', 'Cleveland', 'East', 'Central'),
  (7, 'Mavericks', 'DAL', 'Dallas', 'West', 'Southwest'),
  (8, 'Nuggets', 'DEN', 'Denver', 'West', 'Northwest'),
  (9, 'Pistons', 'DET', 'Detroit', 'East', 'Central'),
  (10, 'Warriors', 'GSW', 'Golden State', 'West', 'Pacific'),
  (11, 'Rockets', 'HOU', 'Houston', 'West', 'Southwest'),
  (12, 'Pacers', 'IND', 'Indiana', 'East', 'Central'),
  (13, 'Clippers', 'LAC', 'Los Angeles', 'West', 'Pacific'),
  (14, 'Lakers', 'LAL', 'Los Angeles', 'West', 'Pacific'),
  (15, 'Grizzlies', 'MEM', 'Memphis', 'West', 'Southwest'),
  (16, 'Heat', 'MIA', 'Miami', 'East', 'Southeast'),
  (17, 'Bucks', 'MIL', 'Milwaukee', 'East', 'Central'),
  (18, 'Timberwolves', 'MIN', 'Minnesota', 'West', 'Northwest'),
  (19, 'Pelicans', 'NOP', 'New Orleans', 'West', 'Southwest'),
  (20, 'Knicks', 'NYK', 'New York', 'East', 'Atlantic'),
  (21, 'Thunder', 'OKC', 'Oklahoma City', 'West', 'Northwest'),
  (22, 'Magic', 'ORL', 'Orlando', 'East', 'Southeast'),
  (23, '76ers', 'PHI', 'Philadelphia', 'East', 'Atlantic'),
  (24, 'Suns', 'PHX', 'Phoenix', 'West', 'Pacific'),
  (25, 'Trail Blazers', 'POR', 'Portland', 'West', 'Northwest'),
  (26, 'Kings', 'SAC', 'Sacramento', 'West', 'Pacific'),
  (27, 'Spurs', 'SAS', 'San Antonio', 'West', 'Southwest'),
  (28, 'Raptors', 'TOR', 'Toronto', 'East', 'Atlantic'),
  (29, 'Jazz', 'UTA', 'Utah', 'West', 'Northwest'),
  (30, 'Wizards', 'WAS', 'Washington', 'East', 'Southeast');
