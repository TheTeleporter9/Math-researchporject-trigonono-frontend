# Setup Instructions

## Prerequisites

- Node.js 16+ and npm
- A Supabase account (free tier works)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Go to Project Settings → API and copy:
   - Project URL
   - anon/public key

3. Run the application and navigate to `/admin/config`
   - Enter your Supabase URL and anon key
   - Click "Save Configuration"

4. In Supabase, go to SQL Editor and run the SQL script from:
   - `src/config/database.sql`
   
   This creates all necessary tables and security policies.

## Usage

### For Teachers

1. Navigate to `/teacher/dashboard`
2. Create a new session:
   - Choose game type (Team Triangle Matching or Individual QR Progression)
   - Configure duration, difficulty, and other settings
   - Click "Create Session"
4. Start the session when ready
5. Share the join code with students
6. Monitor progress in real-time
7. Export research data when session ends

### For Students

1. Navigate to `/student/join`
2. Enter the 6-character join code from your teacher
3. (For team games) Enter a team name
4. Click "Join Session"
5. Play the game according to instructions

## Game Types

### Team-Based Triangle Matching

- Students work in teams
- Match reference triangles by measuring sides and angles
- Incorrect answers reset to level 1
- Winning team has fewest mistakes when time runs out

### Individual QR Code Progression

- Single-player game
- Answer geometry questions to fill QR code cells
- Scan QR code to complete level
- Advance through levels by completing QR codes correctly
- Highest level reached wins

## Research Data

All game data is stored in Supabase tables:

- `triangle_attempts` - Each triangle selection attempt
- `qr_progression` - Each question answer and QR cell fill
- `level_completions` - Level completion records
- `session_outcomes` - Final results per student/team

Export data from the Teacher Dashboard for analysis.

## Configuration

Game parameters can be configured per session:

- Duration (minutes)
- Difficulty level
- Number of triangles/questions
- Maximum levels

These settings are stored in the `sessions.config` JSONB column and can be modified without code changes.

## Troubleshooting

### "Session not found" error
- Make sure the session is active (status = 'active')
- Check that the join code is correct
- Verify Supabase connection is configured
- Ensure RLS policies allow public access (see database.sql)

### QR code scanner not working
- Ensure camera permissions are granted
- Use HTTPS or localhost (required for camera access)
- Try a different browser

### Realtime updates not working
- Check Supabase Realtime is enabled in project settings
- Verify RLS policies allow the operations
- Check browser console for errors

## Development

The application uses:
- React 18
- React Router for navigation
- Supabase for backend
- Konva for canvas graphics
- html5-qrcode for QR scanning
- qrcode for QR generation

## Production Build

```bash
npm run build
```

The `dist` folder contains the production build.
