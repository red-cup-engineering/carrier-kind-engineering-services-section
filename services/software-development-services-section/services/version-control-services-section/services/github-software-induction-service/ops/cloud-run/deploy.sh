#!/usr/bin/env bash
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?set GOOGLE_CLOUD_PROJECT}"
: "${CLOUDFLARE_R2_ACCOUNT_ID:?set CLOUDFLARE_R2_ACCOUNT_ID}"
: "${CLOUDFLARE_R2_BUCKET:?set CLOUDFLARE_R2_BUCKET}"
script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
region=${CLOUD_RUN_REGION:-us-central1}
service=${CLOUD_RUN_SERVICE:-github-software-induction-service}
tag=${IMAGE_TAG:-$(date -u +%Y%m%dT%H%M%SZ)}
image=${IMAGE_URI:-${region}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/capability-cells/${service}:${tag}}

if [[ -z "${IMAGE_URI:-}" ]]; then
  context_dir=$(mktemp -d /tmp/github-software-induction-cloud-build.XXXXXXXX)
  trap 'rm -rf -- "$context_dir"' EXIT
  "$script_dir/prepare-context.sh" "$context_dir"
  gcloud builds submit "$context_dir" --project "$GOOGLE_CLOUD_PROJECT" \
    --config "$context_dir/cloudbuild.yaml" --substitutions "_IMAGE_URI=$image"
fi

gcloud run deploy "$service" --project "$GOOGLE_CLOUD_PROJECT" --region "$region" \
  --image "$image" --allow-unauthenticated --execution-environment gen2 \
  --min-instances 0 --max-instances 2 --concurrency 4 --cpu 2 --memory 2Gi --timeout 900 --port 8080 \
  --set-env-vars "HOST=0.0.0.0,ACTIVITYPUB_ORIGIN=https://github-software-induction-service.invalid,ACTIVITYPUB_IDENTIFIER=github-software-induction-service,ACTIVITYPUB_KEYS_PATH=/secrets/activitypub/keys.json,CLOUDFLARE_R2_ACCOUNT_ID=${CLOUDFLARE_R2_ACCOUNT_ID},CLOUDFLARE_R2_BUCKET=${CLOUDFLARE_R2_BUCKET},AGENT_CARD_SIGNING_KEY=/secrets/a2a-key/signing-key.pem,AGENT_CARD_JWKS=/secrets/a2a-jwks/jwks.json,AGENT_CARD_SIGNING_KID=github-software-induction-service-ed25519,AGENT_CARD_SIGNING_ALG=EdDSA" \
  --update-secrets "/secrets/activitypub/keys.json=github-software-induction-activitypub-keys:latest,/secrets/a2a-key/signing-key.pem=github-software-induction-signing-key:latest,/secrets/a2a-jwks/jwks.json=github-software-induction-jwks:latest,GITHUB_SERVICES_TOKEN=github-software-induction-token:latest,API_KEY_CLOUDFLARE_R2_EDIT=cloudflare-r2-api-token:latest"
service_url=$(gcloud run services describe "$service" --project "$GOOGLE_CLOUD_PROJECT" --region "$region" --format='value(status.url)')
gcloud run services update "$service" --project "$GOOGLE_CLOUD_PROJECT" --region "$region" --update-env-vars "BASE_URL=$service_url,ACTIVITYPUB_ORIGIN=$service_url"
printf 'service_url=%s\nimage=%s\n' "$service_url" "$image"
