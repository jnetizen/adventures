# Supabase CLI Setup Guide

This project uses Supabase CLI for database migrations. Follow these steps to set up and run migrations.

## Prerequisites

✅ Supabase CLI is already installed (via `brew install supabase/tap/supabase`)

## Initial Setup (One-time)

### 1. Link Your Supabase Project

You need to link your local project to your remote Supabase project:

```bash
# Use your Project ID from Supabase Dashboard → Settings → General

supabase link --project-ref jspswxtsudjbhgfjpfgo
```

You'll be prompted to enter your database password. This is the password you set when creating your Supabase project.

### 2. Run the Migration

Once linked, push the migration to your database:

```bash
npm run db:migrate
```

This will apply the migration that adds the missing columns (`adventure_id`, `players`, `current_character_turn_index`, `scene_choices`) to your `sessions` table.

## Available Commands

- `npm run db:migrate` - Push all pending migrations to your linked Supabase project
- `npm run db:migrate:new <name>` - Create a new migration file
- `npm run db:status` - List all migrations and their status
- `npm run db:reset` - Reset local database (if using local Supabase)

## Creating New Migrations

When you need to add new database changes:

```bash
npm run db:migrate:new add_new_feature
```

This creates a new migration file in `supabase/migrations/` with a timestamp. Edit the file, then run:

```bash
npm run db:migrate
```

## Troubleshooting

### "Project not linked"
Run `supabase link --project-ref jspswxtsudjbhgfjpfgo` (use your Project ID).

### "Migration already applied"
If a migration was already applied manually, you can mark it as applied:
```bash
supabase migration repair --status applied <migration-timestamp>
```

### Check migration status
```bash
npm run db:status
```

## Notes

- Migrations are stored in `supabase/migrations/`
- The migration files are version-controlled (committed to git)
- Always test migrations on a development/staging environment first
- The `.gitignore` already excludes Supabase local files (`.branches`, `.temp`)
