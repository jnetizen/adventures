#!/usr/bin/env bash
#
# Initialize Supabase storage folder for the rkang-family.
#
# Creates family-images/rkang-family/ with a placeholder so the folder exists
# before any real images are uploaded.
#
# Usage:
#   export SUPABASE_URL=https://<project-ref>.supabase.co
#   export SUPABASE_SERVICE_KEY=<your-service-role-key>
#   ./scripts/init-rkang-family.sh
#
set -euo pipefail

BUCKET="family-images"
FAMILY="rkang-family"

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

# Ensure bucket exists
echo "==> Ensuring bucket: $BUCKET"
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

# Upload a .keep placeholder to create the folder
echo "==> Creating folder: $FAMILY/"
echo "placeholder" | curl -s -o /dev/null \
  -X POST "$STORAGE_API/object/$BUCKET/$FAMILY/.keep" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: text/plain" \
  -H "x-upsert: true" \
  --data-binary @-

echo "    Done."
echo ""
echo "==> Folder ready at:"
echo "    $SUPABASE_URL/storage/v1/object/public/$BUCKET/$FAMILY/"
echo ""
echo "==> Next steps:"
echo "    1. Add images to the folder (per adventure)"
echo "    2. Visit /dm/$FAMILY to test the family URL"
