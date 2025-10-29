# DnDBug

A comprehensive D&D campaign generation tool built with React + Vite + Tailwind + Express + OpenAI (gpt-4o).

## Architecture Overview

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, HeroUI
- **Backend**: Node.js, Express, ES Modules
- **AI**: OpenAI GPT-4o, GPT-4o-mini, GPT-4-turbo
- **Storage**: File-based JSON storage (`.data/` directory)
- **Deployment**: Vercel Serverless Functions (configured)

### System Architecture

The application follows a **two-layer architecture**:

1. **Macro Layer**: High-level scene chains (5-6 scenes)
2. **Detail Layer**: Individual scene details with narrative core structure

### Key Components

- **Story Background Generator**: Creates world premise, tone, stakes, mysteries
- **Character Generator**: Generates playable D&D PCs with SRD integration
- **Macro Chain System**: Plans scene sequences from background
- **Scene Detail Generator**: Creates detailed scene content with Goal→Conflict→Revelation→Transition
- **Unified Lock System**: Manages locking across backgrounds, characters, chains, and scenes
- **Context Management**: Maintains story consistency across scenes
- **Comprehensive Logging**: Debug and monitoring capabilities

### Data Flow

```
Story Concept
    ↓
Background Generation (locked)
    ↓
Character Generation (locked)
    ↓
Macro Chain Generation (5-6 scenes)
    ↓
Scene Detail Generation (per scene, locked sequentially)
    ↓
Context Accumulation
    ↓
Story Continuity
```

## 📚 Documentation

All project documentation has been organized in the [`/docs`](./docs/) directory:

- **[📖 Documentation Index](./docs/README.md)** - Start here for navigation
- **[🏗️ Implementation Docs](./docs/implementation/)** - Architecture and technical details
- **[🐛 Bug Fixes](./docs/bug-fixes/)** - Bug resolution documentation
- **[✨ Features](./docs/features/)** - Feature completion docs
- **[📊 Logging](./docs/logging/)** - Logging system documentation
- **[📖 Guides](./docs/guides/)** - User guides and references

### Quick Links

- **Logging System:** [Start Here](./docs/logging/LOGGING_SYSTEM_START_HERE.md) | [Quick Reference](./docs/logging/LOGGER_QUICK_REFERENCE.md)
- **Prompt System:** [Active Prompts](./docs/guides/ACTIVE_PROMPTS_SUMMARY.md) | [Full Reference](./docs/guides/PROMPTS_REFERENCE.md)
- **Architecture:** [Two-Layer Architecture](./docs/implementation/TWO_LAYER_ARCHITECTURE.md) | [Unified Lock System](./docs/implementation/UNIFIED_LOCK_SYSTEM.md)
- **Codebase Analysis:** [Comprehensive Analysis](./docs/guides/COMPREHENSIVE_FILE_ANALYSIS.md)

## Setup

### Environment Variables

To enable AI-powered scene generation, you need to set up your OpenAI API key:

1. Create a `.env` file in the project root
2. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```
3. Get your API key from: https://platform.openai.com/api-keys

### Running the Application

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Start the API server: `node server.js`

Or use the convenience script:
```bash
./start-dev.sh
```

The application requires an OpenAI API key to function. Without it, the system will return appropriate error messages.

## Project Structure

```
dndbug/
├── api/                    # Backend API endpoints
├── src/                    # Frontend React application
├── docs/                   # 📚 All documentation (organized by category)
├── public/                 # Static assets
└── README.md              # This file
```

## Key Features

- **AI-Powered Story Generation** - Generate D&D campaigns using GPT-4o with dynamic creativity
- **Macro Chain System** - Plan and manage scene sequences (5-6 scenes per chain)
- **Context-Aware Generation** - Maintains story consistency across all scenes
- **Unified Lock System** - Consistent locking across backgrounds, characters, chains, and scenes
- **Comprehensive Logging** - Debug and monitoring capabilities with rotation
- **SRD Character Integration** - Full D&D 5e character sheet integration
- **Session Management** - Automatic cleanup and archival of old sessions
- **Log Rotation** - Prevents disk space issues with automatic log rotation

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your OPENAI_API_KEY
   ```

3. **Start Development Servers**
   ```bash
   ./start-dev.sh
   ```
   
   Or separately:
   ```bash
   npm run dev        # Frontend (port 5173)
   npm run dev:backend # Backend (port 3000)
   ```

4. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## API Endpoints

All API endpoints use handler files. See [API Endpoints Verification](./docs/guides/API_ENDPOINTS_VERIFICATION.md) for complete mapping.

**Key Endpoints:**
- `POST /api/generate_background` - Generate story background
- `POST /api/characters/generate` - Generate characters
- `POST /api/generate_chain` - Generate macro chain
- `POST /api/generate_detail` - Generate scene details
- `POST /api/context/lock` - Lock context blocks
- `POST /api/scene/unlock` - Unlock scenes

## Project Structure

```
dndbug/
├── api/                    # Backend API endpoints
│   ├── characters/        # Character management
│   ├── context/          # Context management
│   ├── scene/            # Scene operations
│   ├── lib/              # Shared utilities (logger, locks, prompts)
│   └── *.js              # API route handlers
├── src/                   # Frontend React application
│   ├── components/       # React components
│   ├── lib/              # Frontend utilities
│   └── types/            # TypeScript types
├── docs/                  # 📚 All documentation
│   ├── implementation/   # Architecture docs
│   ├── features/         # Feature documentation
│   ├── guides/           # User guides
│   └── logging/          # Logging system docs
├── scripts/              # Utility scripts
│   ├── archive/          # Archived scripts
│   └── debug/            # Debug scripts
├── .data/                # Data storage (JSON files)
└── logs/                 # Rotated log files
```

For detailed documentation, see the [Documentation Index](./docs/README.md).

