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

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed Supabase setup instructions, including:
- Creating the `sessions` table
- Setting up Row Level Security (RLS)
- Enabling Realtime
- Running migrations

**Quick Setup**:
1. Create the `sessions` table (see SUPABASE_SETUP.md)
2. Enable Realtime on the `sessions` table
3. Run migrations: `npm run db:migrate`

### Running the App

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

## Usage

### Complete Flow (v2)

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

3. **Select Adventure:**
   - DM sees adventure selection screen with preview cards
   - Select an adventure (currently: Candy Volcano or Dragon Knight Rescue)
   - Adventure loads automatically

4. **Setup Players:**
   - DM enters kid names (1-3 kids)
   - DM assigns each kid to a character
   - Click "Start Adventure"

5. **Prologue:**
   - Prologue screen appears with world intro, character introductions, and mission brief
   - Parent reads aloud to kids
   - Click "Start Adventure" to begin Scene 1

6. **Play Adventure:**
   - Each scene has narration (read by parent)
   - Scene image displays full-screen on player device
   - Each character takes a turn (DM selects choice, enters dice roll)
   - Success count tracks cumulative successful rolls (DM-only display)
   - After all characters act, DM clicks "Reveal Results"
   - Results display on both screens with animation indicators
   - Scene outcome and rewards display
   - Click "Next Scene" to continue

7. **Ending:**
   - After final scene, tiered ending displays based on success count
   - Endings: Good (0-7 successes), Great (8-11), Legendary (12+)
   - All endings are celebratory with different rewards
   - Click "End Adventure" or "Start New Adventure"

## Features (v2)

### Adventure Selection
- Visual grid of available adventures
- Preview cards show: image, title, tagline, themes, estimated time
- Easy selection and loading

### Prologue System
- Dedicated prologue screen before Scene 1
- World introduction
- Character introductions with images
- Mission brief
- Sets context for the adventure

### Cumulative Scoring
- Tracks successful rolls across all scenes
- Success count increments when roll >= threshold
- Persists across scenes
- Resets when starting new adventure
- Displayed subtly on DM screen (parent-only)

### Tiered Endings
- Three ending tiers based on cumulative success count
- Good, Great, and Legendary endings
- Each tier has unique narration and rewards
- All endings are positive and celebratory
- Displayed on both DM and player screens

### Enhanced Rewards
- Rewards have unique IDs for tracking
- Display name, type (item/token/badge), and image
- Scene rewards and ending rewards
- Visual display with images or placeholders

## Adventure Data Format (v2)

Adventures are stored as JSON files in `src/data/adventures/` following the v2 schema:

### Required Fields
- `id`: Unique adventure identifier
- `title`: Display title
- `description`: Brief description
- `preview`: Selection screen metadata (tagline, themes, estimatedMinutes, previewImageUrl)
- `prologue`: Pre-scene content (worldIntro, characterIntros[], missionBrief)
- `characters`: Array of playable characters
- `scoring`: Thresholds mapping success count to ending IDs
- `scenes`: Array of 5 scenes (sceneNumber 0-4)
- `endings`: Array of tiered endings (good/great/legendary)

### Scene Structure
- `sceneNumber`: 0-based index (0-4)
- `narrationText`: 2-3 sentences, read aloud
- `sceneImageUrl`: Full-screen image path
- `characterTurns`: One turn per character
- `outcome`: Scene conclusion with `nextSceneId` (null for final scene)

### Scoring System
- Each choice has `successThreshold` (typically 10, or 5 for celebration scenes)
- Roll >= threshold = success (increments `success_count`)
- Roll < threshold = fail (still moves story forward, no increment)
- Ending determined by first threshold where `success_count >= minSuccesses`

See `src/types/adventure.ts` for complete type definitions.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── RoomCode.tsx
│   ├── ConnectionStatus.tsx
│   ├── PlaceholderImage.tsx
│   ├── RewardCelebration.tsx
│   ├── DiceRoller.tsx
│   └── ...
├── pages/              # Page components
│   ├── LandingPage.tsx
│   ├── DMPage.tsx
│   ├── PlayPage.tsx
│   ├── ProloguePage.tsx
│   ├── AdventureSelectPage.tsx
│   └── EndingPage.tsx
├── lib/                # Utility functions
│   ├── supabase.ts     # Supabase client
│   ├── gameState.ts    # Game state management
│   └── adventures.ts   # Adventure loading and helpers
├── types/              # TypeScript type definitions
│   ├── adventure.ts    # Adventure data types (v2 schema)
│   ├── game.ts         # Game session types
│   └── supabase.ts     # Database schema types
├── data/
│   └── adventures/     # Adventure JSON files
│       ├── candy-volcano.json
│       ├── dragon-knight-rescue.json
│       └── fire-gem-quest.json
├── App.tsx             # Router setup
└── main.tsx            # Entry point

public/images/           # Static image assets
├── adventures/          # Preview images for adventure selection
├── scenes/              # Scene images (full-screen on player)
├── prologues/           # Prologue images (world reveal)
└── rewards/             # Reward icons (badges, items)

docs/                    # Documentation
├── TESTING.md           # Testing guide and validation checklist
├── IDEAS.md             # Future feature backlog
├── CONTENT_QA.md        # Content issues and missing assets
├── image_generation_learnings.md  # Prompt engineering guide
└── ...

quest-family-illustrations/  # Illustration pipeline assets
├── assets/stories/      # Pre-baked scene images per adventure
├── config/stories/      # Story templates and prompts
└── _archive/            # Archived compositor v1 code
```

## Illustration Pipeline

The `quest-family-illustrations/` directory contains assets and prompts for generating scene images.

### Current Approach

Based on manual testing, we generate complete scenes (characters baked in) using:
- **Flux Schnell** or **Gemini Pro** for scene generation
- Pre-baked images stored in `assets/stories/{adventure-name}/scenes/`

For prompt engineering best practices, see [docs/image_generation_learnings.md](docs/image_generation_learnings.md).

### Archived Code

The original automated compositor (v1) is archived in `_archive/`. It was replaced with pre-baked scenes which produce cleaner results.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[TESTING.md](docs/TESTING.md)**: Testing guide, validation checklist, bug reporting
- **[CONTENT_QA.md](docs/CONTENT_QA.md)**: Missing assets, content issues, generation checklist
- **[image_generation_learnings.md](docs/image_generation_learnings.md)**: Prompt engineering for illustrations
- **[IDEAS.md](docs/IDEAS.md)**: Future feature backlog
- **[USER_RESEARCH.md](docs/USER_RESEARCH.md)**: User testing sessions and feedback
- **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)**: Common tasks and troubleshooting

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database Migrations

- `npm run db:migrate` - Apply migrations to Supabase
- `npm run db:migrate:new <name>` - Create new migration
- `npm run db:status` - Check migration status

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for migration setup.

## What's Next?

### Immediate Priorities
- User testing with v2 features
- Bug fixes from testing
- Polish UX based on feedback

### Near-Term
- Create 1-2 new adventures
- Improve error handling
- Performance optimizations
- Adventure editor (basic version)

### Future Ideas
See [docs/IDEAS.md](docs/IDEAS.md) for the full backlog, including:
- Player-driven choices (kids select on player screen)
- Sound effects and animations
- Adventure editor for parents
- More adventures and content
- Offline mode
- PWA improvements

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

## License

MIT
