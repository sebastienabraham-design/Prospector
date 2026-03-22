# Workspace

## Overview

Real Estate Prospector — a mobile app for real estate agents to log prospect encounters on a map, take notes, and manage follow-up actions on an agenda.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Mobile**: Expo (React Native) with expo-router

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── mobile/             # Expo React Native mobile app
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

### Mobile App (artifacts/mobile)

Three tabs:
1. **Map tab** — Interactive map with color-coded pins per prospect status. Tap the map to add a new prospect. Filter by status. (react-native-maps, web fallback provided)
2. **Contacts tab** — Searchable list of all prospects with status filter chips, contact cards with avatars
3. **Agenda tab** — Grouped follow-up actions (overdue, today, tomorrow, this week, later), stats, completion tracking

Screens:
- `app/(tabs)/index.tsx` — Native map screen (iOS/Android)
- `app/(tabs)/index.web.tsx` — Web fallback for map screen
- `app/(tabs)/contacts.tsx` — Contacts list
- `app/(tabs)/agenda.tsx` — Follow-up actions agenda
- `app/add-contact.tsx` — Add new prospect (formSheet)
- `app/contact/[id].tsx` — Contact detail with edit + actions

### API Server (artifacts/api-server)

REST API endpoints:
- `GET/POST /api/contacts` — List and create contacts
- `GET/PUT/DELETE /api/contacts/:id` — Get, update, delete contact
- `GET/POST /api/actions` — List and create follow-up actions
- `PUT/DELETE /api/actions/:id` — Update and delete action

### Database Schema (lib/db)

Tables:
- `contacts` — Prospect contacts with lat/lng, status, notes, property type
- `actions` — Follow-up actions linked to contacts (call, visit, email, meeting, other)

Enums:
- `contact_status`: new, contacted, interested, not_interested, closed
- `action_type`: call, visit, email, meeting, other

## Colors

Navy blue (`#1B3A6B`) primary, gold accent (`#F5A623`), teal (`#2AB5A8`). Status colors: blue=new, amber=contacted, green=interested, red=not_interested, purple=closed.

## Development

- Run codegen: `pnpm --filter @workspace/api-spec run codegen`
- Push DB schema: `pnpm --filter @workspace/db run push-force`
- Build API: `pnpm --filter @workspace/api-server run build`
