---
title: "Connecting ChatGPT Web to ops.561.group and l-space.561.group over MCP"
description: "The Leader's 2026-09-25/26 goal that outside agents such as ChatGPT Web work in the Group through ops.561.group and l-space.561.group via MCP, and the answers to the Leader's two questions: connect to the server URL rather than a tunnel, and use OAuth."
date-created: 2026-10-10
type: note
keywords:
  - mcp
  - chatgpt-web
  - oauth
  - ops
  - l-space
cites-utterances:
  - "ni:///sha-256;Bp2MDuOufyyxNYNtlWDE3M51mKIH9jBEQLnFkOnECPA"
  - "ni:///sha-256;lFqf861bR7k55Y_TL9fx16fBkUMEJjAFYgzfcjyMinQ"
  - "ni:///sha-256;mEu4jF8aq2zoFyYYto0f4AAq6570rz_doNMwGKdNxZM"
---

# Connecting ChatGPT Web to ops.561.group and l-space.561.group over MCP

## The goal

ops.561.group and l-space.561.group are as capable as the Group has ever planned or imagined, and by earning that capability the Group becomes able to connect other agents, ChatGPT Web Chat first, to its systems over MCP. Outside agents then work in the Group through those two hosts (the Leader, 2026-09-25 and 2026-09-26).

## What the house holds

- The MCP resource is Streamable HTTP, served as one web-application resource with bearer authentication and the RFC 9728 `resource_metadata` challenge (`mcp-engineering-services-section/README.md`, export `./http`). Authorization servers live in `oauth-services-section`; stdio MCP is for local clients, and `scripts/bridge-mcp-server.mjs` exposes an authenticated HTTP node to a stdio-only client.
- ChatGPT Web is a character of the Group on MetroPlat with its own sign-in organ (`561-group-services-section/lib/agency/organs/chatgpt-web-sign-in.json`), under the rule `agents-sign-in-as-themselves`.
- ops and L-Space are faces of MetroPlat (`engineering-services-section/content/text/documents/articles/notes/2026/09/26/2026-09-26-note-on-routing-agent-sessions-through-metroplat.md`).

## The Leader's questions, answered

- Server URL or tunnel: ChatGPT Web connects to the public HTTPS URL of the MCP resource. A tunnel is the carrier only for a host with no public address; a host served at its own name needs none.
- OAuth: yes. Custom connectors in ChatGPT's developer mode take a remote HTTPS server URL and offer OAuth or no authentication, not an API key, and ChatGPT registers its redirect dynamically, so the authorization server needs dynamic client registration or a pre-registered client. Local stdio servers do not work with it.
- Sources read 2026-10-10 were vendor guides, not OpenAI's own documentation: [Auth0](https://auth0.com/blog/add-remote-mcp-server-chatgpt/), [Zuplo](https://zuplo.com/docs/mcp-gateway/connect-clients/chatgpt), [Atlan](https://docs.atlan.com/product/capabilities/atlan-ai/how-tos/chatgpt-remote-mcp).

## Requirements

- The ops.561.group MCP resource shall be reachable at a public HTTPS URL that a ChatGPT custom connector accepts.
- The Group's authorization server shall support dynamic client registration for ChatGPT's redirect.
- The L-Space instance shall expose its MCP resource through MetroPlat on the same terms.

## Open

- Plan eligibility and whether Streamable HTTP is required are unconfirmed against OpenAI's documentation.
- How far ops and L-Space meet these requirements today (the Leader asked on 2026-09-26 and the answer is unrecorded) is unread.
