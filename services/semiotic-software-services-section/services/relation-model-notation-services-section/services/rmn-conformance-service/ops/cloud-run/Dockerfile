# syntax=docker/dockerfile:1.7
#
# RMN is a plain Express/Node A2A HTTP server (no native-binary compute like
# paid-ephemeris-gateway's OxiEphemeris), so this Dockerfile has no builder
# stage and no pinned third-party binary download.
FROM node:22.18-bookworm-slim AS runtime

COPY --chown=node:node lib /app/lib

WORKDIR /app/lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section/services/rmn-semantic-conformance
# npm ci refuses here: the checked-in package-lock.json predates a version
# bump of @emsenn/a2a-rmn-task-client-service (1.0.0 -> 1.1.0) and is missing
# express's own subtree entirely, so it is out of sync with package.json.
# npm install resolves the current, in-tree file: dependency graph instead.
# The node:22.18-bookworm-slim base ships npm 10.9.3, which fails to resolve
# --install-links across this monorepo's chained file: dependencies (a2a-
# contracted-agent-service -> a2a-agent-card-key-service -> a2a-agent-card-
# discovery-service); npm >=11 resolves them correctly, verified locally.
RUN npm install -g npm@11 \
    && rm -f package-lock.json \
    && npm install --omit=dev --install-links \
    && npm cache clean --force \
    && node --check bin/server.mjs

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

USER node
EXPOSE 8080
CMD ["node", "bin/server.mjs"]
