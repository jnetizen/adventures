#!/usr/bin/env bash
#
# Setup script for multi-family image storage in Supabase.
#
# Prerequisites:
#   1. Supabase CLI installed:  brew install supabase/tap/supabase
#   2. Logged in:               supabase login
#   3. Project linked:          supabase link --project-ref <your-project-ref>
#   4. Migration applied:       supabase db push
#
# Usage:
#   chmod +x scripts/setup-family-images.sh
#   ./scripts/setup-family-images.sh
#
# What this script does:
#   1. Creates the "family-images" storage bucket (public read)
#   2. Uploads all Wizard's Library images under jenny-family/wizards-library/
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BUCKET="family-images"
FAMILY="jenny-family"
ADVENTURE="wizards-library"
PUBLIC_DIR="public"

# Supabase project URL and service role key (needed for storage admin).
# Set these as environment variables or edit here:
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
  echo ""
  echo "  export SUPABASE_URL=https://<project-ref>.supabase.co"
  echo "  export SUPABASE_SERVICE_KEY=<your-service-role-key>"
  echo ""
  echo "Find these in: Supabase Dashboard → Settings → API"
  exit 1
fi

STORAGE_API="$SUPABASE_URL/storage/v1"
AUTH_HEADER="Authorization: Bearer $SUPABASE_SERVICE_KEY"

# ---------------------------------------------------------------------------
# Step 1: Create bucket (idempotent — ignores "already exists" errors)
# ---------------------------------------------------------------------------
echo "==> Creating bucket: $BUCKET"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$STORAGE_API/bucket" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$BUCKET\", \"name\": \"$BUCKET\", \"public\": true}")

if [ "$HTTP_CODE" = "200" ]; then
  echo "    Bucket created."
elif [ "$HTTP_CODE" = "409" ]; then
  echo "    Bucket already exists (OK)."
else
  echo "    WARNING: Unexpected HTTP $HTTP_CODE creating bucket."
fi

# ---------------------------------------------------------------------------
# Step 2: Upload images
# ---------------------------------------------------------------------------
upload_file() {
  local local_path="$1"
  local remote_path="$2"

  local filename
  filename=$(basename "$local_path")
  local mime_type="image/png"
  case "$filename" in
    *.mp4) mime_type="video/mp4" ;;
    *.jpg|*.jpeg) mime_type="image/jpeg" ;;
    *.webp) mime_type="image/webp" ;;
  esac

  echo "    Uploading: $remote_path"
  curl -s -o /dev/null \
    -X POST "$STORAGE_API/object/$BUCKET/$remote_path" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: $mime_type" \
    -H "x-upsert: true" \
    --data-binary "@$local_path"
}

echo ""
echo "==> Uploading $FAMILY/$ADVENTURE images..."

# All image paths referenced by wizards-library-adventure.json.
# The resolver extracts filenames, so we upload with just the filename
# into family-images/{family}/{adventure}/.

# Scene images
for f in "$PUBLIC_DIR"/images/scenes/wizards-library/*.png; do
  [ -f "$f" ] && upload_file "$f" "$FAMILY/$ADVENTURE/$(basename "$f")"
done

# Cutscene images
for f in "$PUBLIC_DIR"/images/cutscenes/wizards-library/*.png; do
  [ -f "$f" ] && upload_file "$f" "$FAMILY/$ADVENTURE/$(basename "$f")"
done

# Character images referenced by the adventure
for char in spell-seeker brave-caster sparkle-mage blot; do
  local_path="$PUBLIC_DIR/images/characters/$char.png"
  [ -f "$local_path" ] && upload_file "$local_path" "$FAMILY/$ADVENTURE/$char.png"
done

# Reward images referenced by the adventure
for reward in golden-quill eternal-flame enchanted-key spell-scroll library-card silver-library-card library-hero-badge legendary-author-badge; do
  local_path="$PUBLIC_DIR/images/rewards/$reward.png"
  [ -f "$local_path" ] && upload_file "$local_path" "$FAMILY/$ADVENTURE/$reward.png"
done

# Puzzle images
for puzzle in ink-butterfly ink-book ink-feather ink-moon; do
  local_path="$PUBLIC_DIR/images/puzzles/$puzzle.png"
  [ -f "$local_path" ] && upload_file "$local_path" "$FAMILY/$ADVENTURE/$puzzle.png"
done

# Climax video
if [ -f "$PUBLIC_DIR/videos/wizards-library/climax.mp4" ]; then
  upload_file "$PUBLIC_DIR/videos/wizards-library/climax.mp4" "$FAMILY/$ADVENTURE/climax.mp4"
fi

echo ""
echo "==> Done! Images are accessible at:"
echo "    $SUPABASE_URL/storage/v1/object/public/$BUCKET/$FAMILY/$ADVENTURE/<filename>"
echo ""
echo "==> Test URL:"
echo "    $SUPABASE_URL/storage/v1/object/public/$BUCKET/$FAMILY/$ADVENTURE/scene-1.png"
