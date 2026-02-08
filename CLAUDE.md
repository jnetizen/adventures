# Quest Family - Claude Code Project Instructions

## Critical Rules

### NEVER delete assets before confirming upload
On Feb 7 2026, all 22 ring-riders-saturn images were permanently lost because `rm -rf` was run on the local image directories BEFORE the Supabase upload script was executed. The images were untracked in git and unrecoverable.

**Rules:**
- NEVER run `rm -rf` or delete image/asset directories without explicit user approval
- NEVER delete source files until the upload/migration target is confirmed to have received them (e.g., run the upload script, then `curl` a test URL to verify)
- When a plan says "after uploading, delete" -- the upload MUST actually run and succeed first
- If an upload script exists but hasn't been run yet, SAY SO and ask the user before deleting anything

### Asset handling
- User-provided images (from Downloads, Gemini, etc.) are irreplaceable -- treat them as precious
- Always `git add` new asset files immediately so they're recoverable from git history
- When moving assets to Supabase Storage, the sequence is: upload -> verify -> then ask user before deleting local copies

## Project Info

- **Deployment:** https://adventures-blush.vercel.app
- **Supabase URL:** Set in `.env` as `VITE_SUPABASE_URL`
- **Family URLs:** `/dm/{family-slug}` (e.g., `/dm/rkang-family`, `/dm/jenny-family`)
- **Image storage:** Supabase Storage bucket `family-images/{family-slug}/{adventure-id}/`
- **Image resolver:** `src/lib/imageResolver.ts` rewrites local paths to Supabase URLs at runtime when `familySlug` is present

## Family-Exclusive Adventures

Configured in `src/lib/adventures.ts` via `familyExclusiveAdventures` map:
- `ring-riders-saturn` -> `rkang-family` only
