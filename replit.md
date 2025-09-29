# Full-Stack React + Express + Discord Bot Application

## Project Overview
This is a full-stack application imported from GitHub that includes:
- **Frontend**: React 18 with Vite, TypeScript, Tailwind CSS, and Radix UI components
- **Backend**: Express server with TypeScript and Drizzle ORM
- **Discord Bot**: Discord.js bot with extensive command system
- **Database**: PostgreSQL with Drizzle ORM for data management

## Recent Changes
- **2025-09-29**: Successfully imported and configured for Replit environment
- **2025-09-29**: Installed all npm dependencies and resolved TypeScript errors
- **2025-09-29**: Configured Vite dev server with proper host settings (0.0.0.0:5000)
- **2025-09-29**: Set up development workflow and confirmed frontend is working
- **2025-09-29**: Created home page to verify React routing and components
- **2025-09-29**: Configured deployment settings for production autoscale

## Project Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR support
- **Styling**: Tailwind CSS with Radix UI component library
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state
- **Location**: All frontend code in `client/src/`

### Backend (server/)
- **Framework**: Express with TypeScript
- **Build**: TSX for TypeScript execution
- **Database**: PostgreSQL with Drizzle ORM
- **API**: RESTful API structure ready for implementation
- **Development**: Configured with proper CORS and host settings

### Discord Bot (index.cjs + commands/)
- **Framework**: Discord.js v14
- **Features**: Slash commands, verification system, moderation tools
- **Commands**: Extensive command system in `commands/` directory
- **Authentication**: Uses Discord tokens and API keys

### Database Schema (shared/)
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: User management system already defined
- **Migrations**: Configured for safe database operations

## Current Setup Status
✅ Dependencies installed and TypeScript compilation working  
✅ Vite development server configured for Replit (host: 0.0.0.0:5000)  
✅ Frontend serving and hot reload functional  
✅ Express backend running and serving frontend  
✅ Development workflow configured and running  
✅ Deployment configuration set for autoscale production  
⚠️ Database needs to be provisioned (user action required)  
⚠️ Discord bot environment variables need to be configured  

## Required Environment Variables
For the Discord bot to work, these environment variables are needed:
- `DISCORD_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application client ID
- `PREFIX` - Command prefix (default: '.')
- `TENOR_API_KEY` - For GIF commands
- `DISCLOUD_API_KEY` - For hosting commands
- `BOT_NAME` - Bot display name (default: 'Liro')
- `BOT_OWNER_ID` - Bot owner Discord user ID
- `DATABASE_URL` - PostgreSQL connection string

## Development Workflow
- **Command**: `npm run dev`
- **Port**: 5000 (configured for Replit)
- **Hot Reload**: Enabled with Vite HMR
- **Backend/Frontend**: Both served from single Express server

## Production Deployment
- **Type**: Autoscale deployment
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Optimized**: Production-ready with proper static file serving

## Key Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Frontend build configuration
- `server/index.ts` - Main Express server entry point
- `shared/schema.ts` - Database schema definitions
- `index.cjs` - Discord bot main file
- `drizzle.config.ts` - Database migration configuration

## User Preferences
- Prefers comprehensive setup with all components working
- Expects proper Replit environment configuration
- Wants both development and production deployment ready