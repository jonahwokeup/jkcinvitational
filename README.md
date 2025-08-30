# JKC Invitational - Premier League Last Man Standing

A Next.js web application for hosting Premier League "Last Man Standing" competitions among friends and family.

## Features

- **Round-based gameplay**: Each round starts with all players having 1 life
- **Team selection**: Pick one Premier League team per gameweek (no reuse within rounds)
- **Automatic elimination**: Win = survive, Draw/Loss = eliminated
- **Season leaderboard**: Track round wins, gameweeks survived, and other stats
- **Admin tools**: Import fixtures, update results, end seasons
- **Authentication**: Email magic links and Google OAuth
- **Real-time updates**: Automatic round settlement and new round creation

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Validation**: Zod
- **Date handling**: date-fns and date-fns-tz
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 18+ 
- PostgreSQL database (local or cloud)
- Email service for magic link authentication (Gmail, SendGrid, etc.)
- Google OAuth credentials (optional)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd my-app
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/jkc_invitational"

# NextAuth
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"

# Email (for magic link auth)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Database Setup

Generate Prisma client and push the schema:

```bash
npm run db:generate
npm run db:push
```

### 4. Seed the Database

Run the seed script to create the initial competition and test data:

```bash
npm run db:seed
```

This creates:
- JKC Invitational competition
- 3 test users (john@example.com, jane@example.com, bob@example.com)
- Gameweek 1 with 10 Premier League fixtures
- Sample picks for demonstration

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Game Rules

### Core Mechanics

1. **Team Selection**: Pick one Premier League team per gameweek before lock time
2. **No Reuse**: Cannot use the same team twice within a round
3. **Survival**: Win = survive, Draw/Loss = eliminated
4. **Round Winner**: Last player standing wins the round
5. **New Rounds**: Automatically start when a round ends

### Scoring

- **Round Win**: 1 point
- **Season Champion**: Determined by most round wins, then tie-breakers

### Tie-Breakers

1. Most round wins
2. Most gameweeks survived  
3. Earliest first round win date
4. Fewest missed picks
5. Admin decision

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/auth/          # NextAuth API routes
│   ├── auth/              # Authentication pages
│   ├── competition/       # Competition-specific pages
│   ├── dashboard/         # User dashboard
│   └── rules/             # Game rules page
├── lib/                   # Utility functions and configurations
│   ├── actions.ts         # Server actions
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── utils.ts          # Utility functions
│   └── validations.ts    # Zod validation schemas
└── prisma/               # Database schema and migrations
    ├── schema.prisma     # Prisma schema
    └── seed.ts          # Database seed script
```

## Database Schema

### Core Models

- **User**: Authentication and profile data
- **Competition**: Competition settings and metadata
- **Round**: Individual rounds within a competition
- **Entry**: Player participation in a competition/round
- **Gameweek**: Premier League gameweeks with lock times
- **Fixture**: Individual matches with scores and status
- **Pick**: Player's team selection for a gameweek

### Key Relationships

- Each competition has multiple rounds
- Each round has multiple entries (players)
- Each gameweek has multiple fixtures
- Each entry has multiple picks (one per gameweek)

## API Routes

### Authentication
- `POST /api/auth/signin` - Sign in with email or Google
- `GET /api/auth/session` - Get current session

### Server Actions
- `joinCompetition` - Join a competition with invite code
- `createPick` - Submit team pick for current gameweek
- `settleGameweek` - Process gameweek results and eliminate players
- `importFixtures` - Admin: Import new gameweek fixtures
- `updateFixture` - Admin: Update fixture scores/status
- `endSeason` - Admin: End season and crown champion

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

```env
DATABASE_URL="your-production-postgresql-url"
AUTH_SECRET="your-production-secret"
AUTH_URL="https://your-domain.vercel.app"
EMAIL_SERVER_HOST="your-email-provider"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email"
EMAIL_SERVER_PASSWORD="your-password"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with test data
npm run db:studio    # Open Prisma Studio
```

### Adding New Features

1. **Database Changes**: Update `prisma/schema.prisma` and run `npm run db:push`
2. **New Pages**: Create files in `src/app/` following Next.js App Router conventions
3. **Server Actions**: Add to `src/lib/actions.ts`
4. **Validation**: Add schemas to `src/lib/validations.ts`

## Testing the App

1. **Sign In**: Use the test emails or create new accounts
2. **Join Competition**: Use invite code `JKC2025`
3. **Make Picks**: Select teams for Gameweek 1
4. **Admin Functions**: Access `/competition/[id]/admin` to manage fixtures
5. **View Results**: Check leaderboard and round status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open a GitHub issue or contact the development team.
# Site restored to working state
# Preview branch for testing
