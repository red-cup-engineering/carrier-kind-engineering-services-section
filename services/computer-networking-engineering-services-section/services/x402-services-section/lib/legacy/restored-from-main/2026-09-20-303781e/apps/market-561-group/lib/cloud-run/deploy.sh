#!/usr/bin/env bash
# Deploy market.561.group, the one x402 market of the 561 Group, to Cloud Run.
# Every settlement-affecting value is a deployment binding; the source carries none.
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

: "${GOOGLE_CLOUD_PROJECT:?set GOOGLE_CLOUD_PROJECT to the production project}"
: "${X402_PAY_TO:?set X402_PAY_TO to the ruled Base payout address}"

region=${CLOUD_RUN_REGION:-us-central1}
service=${CLOUD_RUN_SERVICE:-market-561-group}
repository=${ARTIFACT_REPOSITORY:-market}
image_tag=${IMAGE_TAG:-$(date -u +%Y%m%dT%H%M%SZ)}
data_bucket=${MARKET_DATA_BUCKET:-${GOOGLE_CLOUD_PROJECT}-market-561-group-data}
runtime_service_account=${CLOUD_RUN_SERVICE_ACCOUNT:-market-561-group@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com}
facilitator=${X402_FACILITATOR:-https://api.cdp.coinbase.com/platform/v2/x402}
facilitator_provider=${X402_FACILITATOR_PROVIDER:-cdp}
image_uri=${region}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${repository}/${service}:${image_tag}

for command in gcloud mktemp npm find grep; do
  command -v "$command" >/dev/null || { echo "required command not found: $command" >&2; exit 69; }
done

context_dir=$(mktemp -d /tmp/market-561-group-cloud-build.XXXXXXXX)
cleanup() { rm -rf -- "$context_dir"; }
trap cleanup EXIT
"$script_dir/prepare-context.sh" "$context_dir" >/dev/null

gcloud builds submit "$context_dir" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --config "$context_dir/cloudbuild.yaml" \
  --substitutions "_IMAGE_URI=$image_uri"

secrets=()
if [[ "$facilitator_provider" == "cdp" ]]; then
  secrets=(--set-secrets "CDP_API_KEY_ID=cdp-api-key-id:latest,CDP_API_KEY_SECRET=cdp-api-key-secret:latest")
fi

gcloud run deploy "$service" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --region "$region" \
  --image "$image_uri" \
  --service-account "$runtime_service_account" \
  --execution-environment gen2 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 20 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 30s \
  --port 8080 \
  --clear-volumes \
  --add-volume "name=market-data,type=cloud-storage,bucket=$data_bucket,readonly=false,mount-options=uid=1000;gid=1000" \
  --clear-volume-mounts \
  --add-volume-mount "volume=market-data,mount-path=/var/lib/market" \
  --set-env-vars "X402_NETWORK=eip155:8453,X402_FACILITATOR_PROVIDER=$facilitator_provider,X402_FACILITATOR=$facilitator,X402_PAY_TO=$X402_PAY_TO,X402_SETTLEMENT_ACCOUNT=eip155:8453:$X402_PAY_TO,MARKET_DATA_ROOT=/var/lib/market,HOST=0.0.0.0${INDEX_VERIFICATION_HASH:+,INDEX_VERIFICATION_HASH=$INDEX_VERIFICATION_HASH}" \
  "${secrets[@]}"

service_url=$(gcloud run services describe "$service" --project "$GOOGLE_CLOUD_PROJECT" --region "$region" --format='value(status.url)')
curl --fail --silent --show-error "$service_url/v1/status"
printf '\nservice_url=%s\nimage=%s\n' "$service_url" "$image_uri"
