#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

: "${GOOGLE_CLOUD_PROJECT:?set GOOGLE_CLOUD_PROJECT to a billing-enabled project}"
: "${CONTROLLER_ACCOUNT:?set CONTROLLER_ACCOUNT to the deployment EIP-155 CAIP-10 controller account}"

region=${CLOUD_RUN_REGION:-us-central1}
service=${CLOUD_RUN_SERVICE:-rmn-semantic-conformance}
repository=${ARTIFACT_REPOSITORY:-obsmetrological-services}
image_tag=${IMAGE_TAG:-$(date -u +%Y%m%dT%H%M%SZ)}
runtime_service_account=${CLOUD_RUN_SERVICE_ACCOUNT:-rmn-semantic-conformance@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com}
image_uri=${region}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${repository}/${service}:${image_tag}

for command in gcloud mktemp tar curl; do
  command -v "$command" >/dev/null || { echo "required command not found: $command" >&2; exit 69; }
done

context_dir=$(mktemp -d /tmp/rmn-semantic-conformance-cloud-build.XXXXXXXX)
cleanup() { rm -rf -- "$context_dir"; }
trap cleanup EXIT
"$script_dir/prepare-context.sh" "$context_dir" >/dev/null

gcloud config set project "$GOOGLE_CLOUD_PROJECT"
gcloud builds submit "$context_dir" \
  --config "$context_dir/cloudbuild.yaml" \
  --substitutions "_IMAGE_URI=$image_uri"

# RMN is a stateless RMN/RML canonicalization and conformance checker: it
# writes nothing to disk of its own (verified against src/*.mjs and bin/*.mjs
# before this deploy.sh was written), so unlike RWIL it carries no volume
# mount and no single-instance ceiling.
gcloud run deploy "$service" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$region" \
  --image "$image_uri" \
  --service-account "$runtime_service_account" \
  --execution-environment gen2 \
  --allow-unauthenticated \
  --min-instances 0 \
  --cpu 1 \
  --memory 512Mi \
  --port 8080 \
  --set-env-vars "HOST=0.0.0.0,CONTROLLER_ACCOUNT=$CONTROLLER_ACCOUNT" \
  --update-secrets "/secrets/rmn-signing/signing-key.pem=rmn-semantic-conformance-signing-key:latest,/secrets/rmn-jwks/jwks.json=rmn-semantic-conformance-jwks:latest" \
  --set-env-vars "AGENT_CARD_SIGNING_KEY=/secrets/rmn-signing/signing-key.pem,AGENT_CARD_JWKS=/secrets/rmn-jwks/jwks.json,AGENT_CARD_SIGNING_KID=rmn-semantic-conformance-ed25519"

service_url=$(gcloud run services describe "$service" --project "$GOOGLE_CLOUD_PROJECT" --region "$region" --format='value(status.url)')

# The public URL is only known after the first deploy created the service, so
# BASE_URL (which the served Agent Card and its JWKS jku are built from) is
# bound in a second, cheap update rather than a rebuild.
gcloud run services update "$service" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$region" \
  --update-env-vars "BASE_URL=$service_url"

curl --fail --silent --show-error "$service_url/.well-known/agent-card.json" >/dev/null
printf '\nservice_url=%s\nimage=%s\n' "$service_url" "$image_uri"
