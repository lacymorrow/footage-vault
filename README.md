# Footage Vault

A footage management system with a Next.js web dashboard and CLI tool. Catalog, search, and manage video recordings across drives.

## Features

- **Web Dashboard**: Browse recordings, search across files and transcripts, manage drives and people
- **CLI Tool**: Scan directories for video files, extract metadata with ffprobe, compute checksums, auto-ingest
- **API**: RESTful API for ingesting, querying, and searching footage metadata
- **Database**: PostgreSQL (Neon) with Drizzle ORM

## Quick Start

### 1. Set up the database

Create a Neon Postgres database at [neon.tech](https://neon.tech). Copy the connection string.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your `DATABASE_URL` and `API_KEY`.

### 3. Push database schema

```bash
npx drizzle-kit push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Set up the CLI

```bash
cd cli
npm install
npm run build
```

Configure the CLI:

```bash
node dist/index.js config --api-url http://localhost:3000 --api-key YOUR_KEY
```

Scan footage:

```bash
node dist/index.js scan /path/to/footage --dest "Drive A"
```

Watch for new files:

```bash
node dist/index.js watch /path/to/footage --dest "Drive A"
```

Search:

```bash
node dist/index.js search "interview"
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables:
   - `DATABASE_URL` - your Neon connection string
   - `API_KEY` - your chosen API key
4. Deploy

The database schema needs to be pushed once:

```bash
DATABASE_URL=your_connection_string npx drizzle-kit push
```

## Web Dashboard Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with search, stats, recent offloads |
| `/recordings` | Filterable table of all recordings |
| `/recordings/[id]` | Recording detail with metadata, transcript, linked people |
| `/search` | Full-text search across recordings and transcripts |
| `/people` | People list with recording counts |
| `/people/[id]` | Person detail with timeline of recordings |
| `/drives` | Drive inventory with stats |
| `/settings` | API key generation and CLI setup instructions |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/ingest` | Ingest recording metadata (API key required) |
| `GET` | `/api/recordings` | List recordings with filters |
| `GET` | `/api/recordings/[id]` | Single recording with transcript and people |
| `GET` | `/api/search` | Full-text search |
| `GET` | `/api/people` | List people |
| `GET` | `/api/people/[id]` | Person detail |
| `GET` | `/api/drives` | Drive inventory |
| `POST` | `/api/transcribe` | Placeholder (501) |

## CLI Commands

| Command | Description |
|---------|-------------|
| `vault scan <path> --dest <drive>` | Scan directory, probe files, upload metadata |
| `vault watch <path> --dest <drive>` | Watch directory for new video files |
| `vault search <query>` | Search recordings from terminal |
| `vault config` | View or set API URL and key |

## Tech Stack

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Drizzle ORM + Neon Postgres
- Commander.js (CLI)
- Zod (validation)
