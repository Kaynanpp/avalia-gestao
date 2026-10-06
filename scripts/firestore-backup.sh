#!/bin/sh
set -eu

if [ "${FIRESTORE_BACKUP_ALLOW:-}" != "true" ]; then
  echo "Defina FIRESTORE_BACKUP_ALLOW=true para iniciar uma exportação." >&2
  exit 1
fi
: "${FIREBASE_PROJECT_ID:?Defina FIREBASE_PROJECT_ID}"
: "${FIRESTORE_BACKUP_BUCKET:?Defina FIRESTORE_BACKUP_BUCKET sem gs://}"

command -v gcloud >/dev/null 2>&1 || {
  echo "gcloud não está instalado. Execute este script no Cloud Shell ou em um executor administrativo." >&2
  exit 1
}

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="gs://${FIRESTORE_BACKUP_BUCKET}/avalia-gestao/${timestamp}"

gcloud firestore export "$destination" \
  --project "$FIREBASE_PROJECT_ID" \
  --database='(default)' \
  --async

echo "Exportação solicitada. Confira a operação antes de considerar o backup concluído."
echo "Destino: $destination"
