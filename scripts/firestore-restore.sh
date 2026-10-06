#!/bin/sh
set -eu

if [ "${FIRESTORE_RESTORE_ALLOW:-}" != "true" ]; then
  echo "Defina FIRESTORE_RESTORE_ALLOW=true somente durante um procedimento de restauração aprovado." >&2
  exit 1
fi
: "${FIREBASE_RESTORE_PROJECT_ID:?Defina FIREBASE_RESTORE_PROJECT_ID}"
: "${FIRESTORE_EXPORT_METADATA_URI:?Defina a URI gs:// do arquivo .overall_export_metadata}"

command -v gcloud >/dev/null 2>&1 || {
  echo "gcloud não está instalado. Execute este script no Cloud Shell ou em um executor administrativo." >&2
  exit 1
}

if [ "${FIRESTORE_RESTORE_CONFIRMED_PROJECT:-}" != "$FIREBASE_RESTORE_PROJECT_ID" ]; then
  echo "FIRESTORE_RESTORE_CONFIRMED_PROJECT deve repetir exatamente o projeto de destino." >&2
  exit 1
fi

gcloud firestore import "$FIRESTORE_EXPORT_METADATA_URI" \
  --project "$FIREBASE_RESTORE_PROJECT_ID" \
  --database='(default)' \
  --async

echo "Importação solicitada. Acompanhe a operação e execute a validação pós-restauração."
