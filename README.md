# Lore Keeper

<div align="center">
  <img src="apps/web/public/images/loreKeeperlogo3.png" alt="Lore Keeper Logo" width="200" />
  
  **AI-Powered Journaling Platform**
  
  *Cyberpunk journal with GPT-4 memory. Transform your life into an organized, searchable narrative.*
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
</div>

---

## What is Lore Keeper?

**Lore Keeper** is an intelligent journaling platform that helps you capture, organize, and understand your life story. Think of it as a personal AI assistant that remembers everything, finds patterns in your experiences, and helps you write your memoir—all while maintaining perfect continuity and context.

### For Everyone (Non-Technical Users)

**What can Lore Keeper do for you?**

- **📖 Write Your Story**: Create journal entries naturally, and Lore Keeper organizes them into meaningful chapters automatically
- **🧠 AI Memory**: Your AI assistant remembers everything you've written and can answer questions about your past experiences
- **👥 Track Relationships**: Automatically identifies people and places in your entries, building a network of your relationships
- **📊 Visual Timeline**: See your life story unfold chronologically with beautiful visualizations
- **📚 Build Your Memoir**: Transform your journal entries into a polished memoir with AI assistance
- **🔍 Smart Search**: Ask questions in natural language like "What did I do with Sarah last month?" and get instant answers
- **✨ Discover Patterns**: Get insights about your habits, relationships, and life patterns

**Why use Lore Keeper?**

Traditional journals are hard to search, don't connect related events, and can't help you understand patterns in your life. Lore Keeper uses AI to:
- Connect related memories automatically
- Find insights you might have missed
- Help you write your life story
- Answer questions about your past
- Maintain continuity across your entire narrative

---

## Key Features

### User-Facing Features

#### 💬 **AI Chat Assistant**
- Natural language conversations about your memories
- Streaming responses for real-time interaction
- Slash commands for quick actions (`/recent`, `/characters`, `/search`)
- Context-aware responses using your entire journal history
- Source citations showing where information came from

#### 📖 **Journal Entries**
- Rich text journaling with markdown support
- Automatic tagging and mood detection
- AI-generated summaries
- Voice memo transcription
- Photo integration with location context
- Date extraction from natural language

#### 📚 **Chapters & Story Arcs**
- Organize entries into meaningful chapters
- Automatic chapter suggestions based on themes
- Timeline visualization of your story arcs
- Chapter summaries and insights

#### 👥 **Character & Relationship Tracking**
- Automatic character detection from entries
- Relationship mapping (friends, family, colleagues)
- Character timelines showing their role in your story
- Knowledge base for each person/place

#### 📊 **Omni Timeline**
- 9-layer hierarchical timeline (Mythos → Epochs → Eras → Sagas → Arcs → Chapters → Scenes → Actions → MicroActions)
- Color-coded visualization
- Nested timeline display showing parent-child relationships
- Multiple view modes (graph, cards, chapters)
- Chronological sorting with precision handling

#### 🔍 **Memory Explorer (HQI Search)**
- Natural language search queries
- Semantic search powered by embeddings
- Automatic filter detection (dates, characters, tags, motifs)
- Detailed result modals with context

#### 📖 **Memoir Editor**
- Write and edit memoir sections
- AI assistance for writing and editing
- Continuity checking (Omega Canon Keeper)
- Document upload and processing
- Section organization and hierarchy

#### 📘 **Lore Book (Reading Mode)**
- Beautiful reading interface with book-like typography
- Font size and line height controls
- Section navigation with progress indicators
- Timeline visualization at the bottom
- Chat interface for asking questions about the book

#### ✅ **Task Engine**
- Goal and milestone tracking
- Task creation from chat commands
- Microsoft To-Do integration
- Task timeline links

#### 🧠 **Insights & Discovery**
- Pattern detection across your memories
- Identity pulse tracking
- Continuity checking
- Drift detection
- Memory fabric visualization

### Technical Features

#### 🏗️ **Architecture**
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **AI**: OpenAI GPT-4 for chat and content generation
- **Search**: Vector embeddings for semantic search (HQI)
- **Styling**: Tailwind CSS with custom cyberpunk theme

#### 🔐 **Security**
- Row Level Security (RLS) policies
- User authentication via Supabase Auth
- Secure API endpoints
- Data isolation per user

#### 🧪 **Testing**
- Unit tests with Vitest
- Integration tests
- E2E tests with Playwright
- Test coverage reporting

#### 📦 **Development Tools**
- Hot module replacement (HMR)
- TypeScript strict mode
- ESLint + Prettier
- Pre-commit hooks
- GitHub Actions CI/CD

---

## Getting Started

### For Users

**Quick Start (5 minutes)**

1. **Sign Up**: Create an account using email or Google
2. **Start Writing**: Create your first journal entry
3. **Explore**: Check out the Timeline, Characters, and Chat features
4. **Ask Questions**: Try asking the AI about your entries

**First Steps**

- Write a few journal entries about recent events
- Let Lore Keeper automatically detect characters and relationships
- Try asking the AI: "What have I been working on lately?"
- Explore the Timeline to see your entries visualized
- Check out the Characters tab to see people automatically tracked

### For Developers

#### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (Install: `npm install -g pnpm`)
- **Supabase Account** ([Sign up](https://supabase.com/)) or local Supabase CLI
- **OpenAI API Key** ([Get one](https://platform.openai.com/api-keys))

#### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/lorekeeper.git
cd lorekeeper

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials (see below)
```

#### Environment Setup

Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key

# Server Configuration
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
```

**For Local Development:**

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize and start Supabase locally
supabase init
supabase start

# Copy the credentials shown to your .env file
# They'll look like:
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=eyJhbGc...
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Run database migrations
supabase db reset
```

#### Running the Application

```bash
# Terminal 1: Start the backend server
pnpm dev:server
# Server runs on http://localhost:4000

# Terminal 2: Start the frontend web app
pnpm dev:web
# Web app runs on http://localhost:5173
```

**Open your browser** to `http://localhost:5173` and start using Lore Keeper!

#### Populating Dummy Data

To see Lore Keeper in action with sample data:

1. Open the browser console (F12)
2. Copy and paste the script from `populate-browser-console.js`
3. Press Enter
4. Wait for "Population complete!"
5. The page will refresh automatically

This creates:
- 3 chapters spanning 2 years
- 23 journal entries with relationships
- 5 characters/places
- 3 memoir sections
- Sample tasks

---

## Project Structure

```
lorekeeper/
├── apps/
│   ├── web/                    # Frontend React application
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   │   ├── chat/      # Chat interface
│   │   │   │   ├── timeline/  # Timeline visualizations
│   │   │   │   ├── characters/# Character management
│   │   │   │   ├── memoir/    # Memoir editor
│   │   │   │   └── lorebook/  # Reading interface
│   │   │   ├── hooks/         # React hooks
│   │   │   ├── lib/           # Utilities
│   │   │   └── pages/         # Page components
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   └── server/                 # Backend Express API
│       ├── src/
│       │   ├── routes/        # API route handlers
│       │   ├── services/      # Business logic
│       │   ├── types/         # TypeScript types
│       │   └── index.ts       # Server entry point
│       └── package.json
│
├── lorekeeper/                 # Python backend (legacy/orchestrator)
│   ├── orchestrator/          # Main orchestration engine
│   ├── continuity/            # Continuity checking
│   ├── persona/               # Persona engine
│   └── ...
│
├── migrations/                 # Database migrations
│   ├── 000_setup_all_tables.sql
│   ├── 20250120_timeline_hierarchy.sql
│   └── ...
│
├── scripts/                    # Utility scripts
│   ├── setup-dev.sh           # Development setup
│   └── populate-dummy-data.ts # Data seeding
│
└── package.json                # Root package.json (monorepo)
```

---

## Architecture Overview

### Frontend Architecture

**Technology Stack:**
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for styling with custom cyberpunk theme
- **React Query** for data fetching and caching
- **Zustand** for state management (where needed)

**Key Components:**
- **Chat Interface**: Streaming AI responses with source citations
- **Timeline Views**: Multiple visualization modes (graph, cards, hierarchy)
- **Character System**: Relationship tracking and knowledge base
- **Memoir Editor**: Rich text editing with AI assistance
- **Lore Book**: Reading-optimized interface

### Backend Architecture

**Technology Stack:**
- **Node.js + Express** for REST API
- **TypeScript** for type safety
- **Supabase Client** for database access
- **OpenAI API** for AI features

**Key Services:**
- **Memory Service**: Journal entry management
- **Chapter Service**: Story arc organization
- **Character Service**: Relationship tracking
- **HQI Service**: Semantic search with embeddings
- **Timeline Manager**: Hierarchical timeline management
- **Orchestrator**: Python-based AI orchestration (legacy)

### Database Schema

**Core Tables:**
- `journal_entries`: User journal entries
- `chapters`: Story chapters and arcs
- `characters`: People and places
- `memoir_sections`: Memoir content
- `tasks`: Goals and milestones
- `timeline_*`: 9-layer hierarchy tables (mythos, epochs, eras, sagas, arcs, chapters, scenes, actions, microactions)

**Security:**
- Row Level Security (RLS) on all tables
- User isolation via `user_id` foreign keys
- Secure API endpoints with authentication

---

## Development Guide

### Available Scripts

```bash
# Development
pnpm dev:web      # Start web app (port 5173)
pnpm dev:server   # Start API server (port 4000)

# Building
pnpm build        # Build all apps for production

# Testing
pnpm test         # Run all tests
pnpm test:coverage # Run tests with coverage
pnpm test:e2e     # Run end-to-end tests

# Code Quality
pnpm lint         # Lint all code
pnpm format       # Format code with Prettier
```

### Development Workflow

1. **Start Supabase** (if using local):
   ```bash
   supabase start
   ```

2. **Start Development Servers**:
   ```bash
   # Terminal 1
   pnpm dev:server
   
   # Terminal 2
   pnpm dev:web
   ```

3. **Make Changes**:
   - Frontend changes hot-reload automatically
   - Backend changes require server restart
   - Database changes require migrations

4. **Run Tests**:
   ```bash
   pnpm test
   ```

5. **Check Linting**:
   ```bash
   pnpm lint
   ```

### Database Migrations

```bash
# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db reset

# Or manually:
psql "your-db-url" -f migrations/your_migration.sql
```

### API Development

**API Routes Structure:**
- `/api/entries` - Journal entry CRUD
- `/api/chapters` - Chapter management
- `/api/characters` - Character management
- `/api/memoir/*` - Memoir operations
- `/api/hqi/*` - Semantic search
- `/api/timeline-hierarchy/*` - Timeline hierarchy operations

**See `BACKEND_FRONTEND_MAPPING.md`** for complete API documentation.

### Adding New Features

1. **Frontend Component**:
   - Create component in `apps/web/src/components/`
   - Add to appropriate surface/page
   - Update types if needed

2. **Backend Endpoint**:
   - Create route in `apps/server/src/routes/`
   - Add service logic in `apps/server/src/services/`
   - Update types in `apps/server/src/types/`

3. **Database Changes**:
   - Create migration file
   - Update types
   - Test migration

---

## Key Concepts

### Timeline Hierarchy

Lore Keeper uses a 9-layer hierarchy to organize memories:

1. **Mythos** - Top-level narrative themes
2. **Epochs** - Major time periods
3. **Eras** - Significant eras within epochs
4. **Sagas** - Long-form story arcs
5. **Arcs** - Story arcs within sagas
6. **Chapters** - Organized chapters
7. **Scenes** - Specific scenes
8. **Actions** - Individual actions
9. **MicroActions** - Granular events

This allows for rich, nested organization of your life story.

### Memory Fabric

The Memory Fabric is a graph-based representation of your memories, where:
- **Nodes** represent memories, characters, concepts
- **Edges** represent relationships and connections
- **Embeddings** enable semantic search and similarity

### HQI (High-Quality Intelligence) Search

HQI provides semantic search capabilities:
- Natural language queries
- Vector embeddings for similarity search
- Automatic filter detection
- Context-aware results

### Continuity Checking

Omega Canon Keeper ensures narrative consistency:
- Detects contradictions in your story
- Suggests corrections
- Maintains timeline accuracy
- Prevents factual drift

---

## Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get up and running fast
- **[Demo Guide](DEMO_GUIDE.md)** - Explore all features
- **[Backend API Mapping](BACKEND_FRONTEND_MAPPING.md)** - Complete API reference
- **[Codex Blueprint](CODEX_BLUEPRINT.md)** - System architecture details
- **[Improvement Plan](IMPROVEMENT_PLAN.md)** - Roadmap and ideas

---

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Add tests** for new features
5. **Run tests**: `pnpm test`
6. **Check linting**: `pnpm lint`
7. **Commit your changes**: `git commit -m "Add your feature"`
8. **Push to your fork**: `git push origin feature/your-feature`
9. **Submit a pull request**

### Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Write tests for new features
- Update documentation as needed

### Testing

- Write unit tests for services and utilities
- Write integration tests for API endpoints
- Write E2E tests for critical user flows
- Aim for >80% code coverage

---

## Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Check Supabase is running: `supabase status`
- Verify `.env` file has correct credentials
- Restart server after updating `.env`

**"Module not found" errors**
- Run `pnpm install` again
- Delete `node_modules` and reinstall
- Check Node.js version: `node --version` (should be 20+)

**"Port already in use"**
- Change `PORT` in `.env` to a different number
- Or kill the process: `lsof -ti:4000 | xargs kill`

**"500 Internal Server Error"**
- Check server logs in terminal
- Verify database tables exist: `supabase db reset`
- Check `.env` configuration

**Frontend not loading**
- Check server is running on port 4000
- Verify API endpoints are accessible
- Check browser console for errors

---

## Technology Stack Details

### Frontend
- **React 18.3+** - UI library
- **TypeScript 5+** - Type safety
- **Vite 5+** - Build tool and dev server
- **Tailwind CSS 3+** - Utility-first CSS
- **Lucide React** - Icon library
- **React Virtual** - Virtual scrolling for performance
- **TanStack Query** - Data fetching and caching

### Backend
- **Node.js 20+** - Runtime
- **Express 4+** - Web framework
- **TypeScript 5+** - Type safety
- **Supabase JS** - Database client
- **OpenAI SDK** - AI integration

### Database
- **PostgreSQL** (via Supabase)
- **Row Level Security** for data isolation
- **Vector extensions** for embeddings
- **Full-text search** capabilities

### AI & ML
- **OpenAI GPT-4** - Chat and content generation
- **OpenAI Embeddings** - Semantic search vectors
- **Whisper API** - Voice transcription

### DevOps
- **GitHub Actions** - CI/CD
- **Vitest** - Testing framework
- **Playwright** - E2E testing
- **ESLint + Prettier** - Code quality

---

## Security & Privacy

- **Authentication**: Supabase Auth with email/password and OAuth
- **Data Isolation**: Row Level Security ensures users only see their data
- **API Security**: All endpoints require authentication
- **Encryption**: Data encrypted at rest and in transit
- **Privacy**: Your data is yours - we don't sell or share it

---

## Performance

- **Frontend**: Code splitting, lazy loading, virtual scrolling
- **Backend**: Efficient queries, connection pooling, caching
- **Database**: Indexed queries, optimized schemas
- **Search**: Vector indexes for fast semantic search

---

## Roadmap

### Current Features (v0.1.0)
- ✅ Journal entries with AI assistance
- ✅ Character and relationship tracking
- ✅ Timeline visualization
- ✅ Memoir editor
- ✅ AI chat with context
- ✅ Semantic search (HQI)
- ✅ 9-layer timeline hierarchy

### Planned Features
- 🔄 Photo gallery integration
- 🔄 Calendar integration
- 🔄 External platform imports (GitHub, Instagram, X/Twitter)
- 🔄 Voice memo transcription
- 🔄 Mobile app
- 🔄 Export to PDF/eBook
- 🔄 Collaborative features
- 🔄 Advanced analytics

---

## License

**Private** - Omega Technologies

All rights reserved. This software is proprietary and confidential.

---

## Support

- **Documentation**: Check the `/docs` folder and markdown files
- **Issues**: Open an issue on GitHub
- **Questions**: Check existing documentation first

---

<div align="center">
  <p>Built with ❤️ by <strong>Omega Technologies</strong></p>
  <p><em>Transform your life into an organized narrative.</em></p>
</div>
