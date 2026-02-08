#!/usr/bin/env bash
#
# Upload Ring Riders of Saturn adventure assets to Supabase Storage.
#
# Usage:
#   export SUPABASE_URL=https://<project-ref>.supabase.co
#   export SUPABASE_SERVICE_KEY=<your-service-role-key>
#   ./scripts/upload-ring-riders-saturn.sh
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BUCKET="family-images"
FAMILY="rkang-family"
ADVENTURE="ring-riders-saturn"
PUBLIC_DIR="public"

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
# Create bucket (idempotent)
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
# Upload helper
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
echo "==> Uploading $FAMILY/$ADVENTURE assets..."

# Scene images
for f in "$PUBLIC_DIR"/images/scenes/ring-riders-saturn/*.png; do
  [ -f "$f" ] && upload_file "$f" "$FAMILY/$ADVENTURE/$(basename "$f")"
done

# Cutscene images
for f in "$PUBLIC_DIR"/images/cutscenes/ring-riders-saturn/*.png; do
  [ -f "$f" ] && upload_file "$f" "$FAMILY/$ADVENTURE/$(basename "$f")"
done

# Character images
for f in "$PUBLIC_DIR"/images/characters/ring-riders-saturn/*.png; do
  [ -f "$f" ] && upload_file "$f" "$FAMILY/$ADVENTURE/$(basename "$f")"
done

# Ending images
for f in "$PUBLIC_DIR"/images/endings/ring-riders-saturn/*.png; do
  [ -f "$f" ] && upload_file "$f" "$FAMILY/$ADVENTURE/$(basename "$f")"
done

# Reward images
for f in "$PUBLIC_DIR"/images/rewards/ring-riders-saturn/*.png; do
  [ -f "$f" ] && upload_file "$f" "$FAMILY/$ADVENTURE/$(basename "$f")"
done

echo ""
echo "==> Done! Assets accessible at:"
echo "    $SUPABASE_URL/storage/v1/object/public/$BUCKET/$FAMILY/$ADVENTURE/<filename>"
echo ""
echo "==> Test URL:"
echo "    $SUPABASE_URL/storage/v1/object/public/$BUCKET/$FAMILY/$ADVENTURE/preview.png"
