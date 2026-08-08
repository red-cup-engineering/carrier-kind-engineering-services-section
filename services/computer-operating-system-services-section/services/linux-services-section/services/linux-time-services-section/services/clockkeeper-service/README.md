# Clockkeeper Service

Clockkeeper answers one question: what time does this system report now?

```sh
node src/service.mjs <<'EOF'
{"@context":"https://www.w3.org/ns/activitystreams","type":"Question","actor":"urn:ame:customer","target":"urn:ame:clockkeeper-service","capability":"urn:ame:clockkeeper-service:capability:read-system-time","object":{"type":"SystemTimeQuestion"}}
EOF
```

Scheduling and delivery are not Clockkeeper capabilities. They belong to the
sibling `scheduled-activity-delivery-service`.
