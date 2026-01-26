# Adventures - Two-Screen Interactive Storytelling App

A web app for family storytelling adventures where a parent acts as the dungeon master (DM) on their phone, and kids watch illustrated scenes on an iPad. Both devices sync in real-time via Supabase Realtime.

## Tech Stack

- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Supabase** for database and real-time sync
- **React Router** for navigation

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your Supabase project URL and anon key:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project dashboard under Settings → API.

### Supabase Setup

1. **Create the `sessions` table:**

Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  current_scene INTEGER DEFAULT 0 NOT NULL,
  phase TEXT DEFAULT 'waiting' NOT NULL CHECK (phase IN ('waiting', 'playing', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_room_code ON sessions(room_code);
```

2. **Enable Row Level Security (RLS):**

```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
```

3. **Create RLS Policies:**

Allow anyone to create sessions:
```sql
CREATE POLICY "Anyone can create sessions"
ON sessions FOR INSERT
TO public
WITH CHECK (true);
```

Allow anyone to read sessions by room code:
```sql
CREATE POLICY "Anyone can read sessions by room code"
ON sessions FOR SELECT
TO public
USING (true);
```

Allow anyone to update sessions:
```sql
CREATE POLICY "Anyone can update sessions"
ON sessions FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
```

4. **Enable Realtime:**

- Go to your Supabase dashboard
- Navigate to **Database** → **Replication**
- Find the `sessions` table and toggle **Realtime** to enabled

5. **Add adventure-tracking columns (migration):**

Run this SQL to add columns used by the adventure data model:

```sql
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS adventure_id TEXT,
  ADD COLUMN IF NOT EXISTS character_assignments JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_character_turn_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scene_choices JSONB DEFAULT '[]';
```

Existing rows will get the defaults. New sessions will store adventure state in these columns.

### Running the App

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

## Usage

1. **Start as DM:**
   - Open the app on your phone
   - Click "Start as DM" on the landing page
   - Click "Create Session" to generate a room code
   - Share the room code with your kids

2. **Join as Player:**
   - Open the app on the iPad
   - Click "Join as Player" on the landing page
   - Enter the room code from the DM screen
   - Click "Join Session"

3. **Test the Sync:**
   - On the DM screen, click "Next Scene" to increment the scene number
   - The player screen should update in real-time showing the new scene number

## GitLab Setup

This project is intended to be stored in a **private GitLab** repository. The repo is already initialized with an initial commit.

To push to GitLab:

1. **Create a new private project** in GitLab (do not initialize with a README).

2. **Add the remote** (replace with your GitLab project URL):
   ```bash
   git remote add origin https://gitlab.com/your-username/adventures.git
   ```
   Or with SSH:
   ```bash
   git remote add origin git@gitlab.com:your-username/adventures.git
   ```

3. **Push the initial commit:**
   ```bash
   git push -u origin main
   ```

Sensitive files (`.env` with Supabase credentials) are listed in `.gitignore` and are not committed. Use `.env.example` as a template when cloning on another machine.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── RoomCode.tsx
│   └── ConnectionStatus.tsx
├── pages/              # Page components
│   ├── LandingPage.tsx
│   ├── DMPage.tsx
│   └── PlayPage.tsx
├── lib/                # Utility functions
│   ├── supabase.ts     # Supabase client
│   └── gameState.ts    # Game state management
├── types/              # TypeScript type definitions
│   ├── game.ts
│   └── supabase.ts
├── App.tsx             # Router setup
└── main.tsx            # Entry point
```

## What's Next?

After verifying the two-screen sync works:

1. **Game Content:**
   - Add scene definitions with illustrations
   - Create choice prompts for kids
   - Build outcome animations

2. **DM Features:**
   - Add narration text display
   - Implement dice roll input
   - Create scene management UI

3. **Player Features:**
   - Display scene illustrations
   - Show choice animations
   - Add sound effects

4. **Polish:**
   - Improve error handling
   - Add loading states
   - Enhance mobile responsiveness
   - Add session cleanup/expiration

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

MIT
