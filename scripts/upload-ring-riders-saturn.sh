#!/usr/bin/env bash
#
# Upload Ring Riders of Saturn adventure assets to Supabase Storage.
# Images are compressed to JPEG 1280px q80 before upload (~98% smaller).
#
# Usage:
#   source .env
#   SUPABASE_URL="$VITE_SUPABASE_URL" ./scripts/upload-ring-riders-saturn.sh
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BUCKET="family-images"
FAMILY="rkang-family"
ADVENTURE="ring-riders-saturn"
PUBLIC_DIR="public"
TMP_DIR=$(mktemp -d)
MAX_WIDTH=1280
JPEG_QUALITY=80

SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
  echo ""
  echo "  source .env"
  echo "  SUPABASE_URL=\"\$VITE_SUPABASE_URL\" ./scripts/upload-ring-riders-saturn.sh"
  echo ""
  exit 1
fi

STORAGE_API="$SUPABASE_URL/storage/v1"
AUTH_HEADER="Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Clean up temp dir on exit
trap 'rm -rf "$TMP_DIR"' EXIT

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
# Compress helper — resize to max width, convert to JPEG
# ---------------------------------------------------------------------------
compress_image() {
  local src="$1"
  local basename_noext="${2%.*}"
  local dest="$TMP_DIR/${basename_noext}.jpg"

  sips -s format jpeg -s formatOptions "$JPEG_QUALITY" -Z "$MAX_WIDTH" "$src" --out "$dest" >/dev/null 2>&1
  echo "$dest"
}

# ---------------------------------------------------------------------------
# Upload helper
# ---------------------------------------------------------------------------
upload_file() {
  local local_path="$1"
  local remote_path="$2"

  local mime_type="image/jpeg"
  case "$remote_path" in
    *.mp4) mime_type="video/mp4" ;;
    *.png) mime_type="image/png" ;;
    *.webp) mime_type="image/webp" ;;
  esac

  echo "    Uploading: $remote_path ($(du -h "$local_path" | cut -f1 | xargs))"
  curl -s -o /dev/null \
    -X POST "$STORAGE_API/object/$BUCKET/$remote_path" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: $mime_type" \
    -H "x-upsert: true" \
    --data-binary "@$local_path"
}

# ---------------------------------------------------------------------------
# Compress + upload for each image directory
# ---------------------------------------------------------------------------
compress_and_upload() {
  local dir="$1"
  local count=0

  for f in "$dir"/*.png "$dir"/*.jpg "$dir"/*.jpeg; do
    [ -f "$f" ] || continue
    local name
    name=$(basename "$f")
    local name_noext="${name%.*}"
    local compressed
    compressed=$(compress_image "$f" "$name")
    upload_file "$compressed" "$FAMILY/$ADVENTURE/${name_noext}.jpg"
    count=$((count + 1))
  done

  echo "    ($count files)"
}

echo ""
echo "==> Compressing to JPEG ${MAX_WIDTH}px q${JPEG_QUALITY} and uploading..."
echo ""

# Scene images
echo "--- Scenes ---"
compress_and_upload "$PUBLIC_DIR/images/scenes/ring-riders-saturn"

# Cutscene images
echo "--- Cutscenes ---"
compress_and_upload "$PUBLIC_DIR/images/cutscenes/ring-riders-saturn"

# Character images
echo "--- Characters ---"
compress_and_upload "$PUBLIC_DIR/images/characters/ring-riders-saturn"

# Ending images
echo "--- Endings ---"
compress_and_upload "$PUBLIC_DIR/images/endings/ring-riders-saturn"

# Reward images
echo "--- Rewards ---"
compress_and_upload "$PUBLIC_DIR/images/rewards/ring-riders-saturn"

echo ""
echo "==> Done! Assets accessible at:"
echo "    $SUPABASE_URL/storage/v1/object/public/$BUCKET/$FAMILY/$ADVENTURE/<filename>.jpg"
echo ""
echo "==> Test URL:"
echo "    $SUPABASE_URL/storage/v1/object/public/$BUCKET/$FAMILY/$ADVENTURE/prologue.jpg"
