---
id: relational-orchestration
description: "Relational orchestration: how work enters, gets stored, gets executed, and gets verified done in the relational machine context."
extends: Orchestration
component-of: FlatfileAgentResourceSystemLocale
date-modified: 2026-03-19
params:
  inbox: relational-universe
  plans: relational-universe
  locale: relational-universe
output: relational-history-fiber-fixed-layer
ast:
  loop-closure-pair:
    - inbox:
        - locale
    - plans:
        - locale
    - triage-loop:
        - inbox
        - plans
    - improvement-loop:
        - plans
---

# Relational Orchestration

**RelationalOrchestration** is [Orchestration](./orchestration.md) as implemented in a relational machine context — where work units are typed markdown entries and stores are locale context files.

## Work storage

Work lives as markdown files.
Two kinds of work files exist in every locale:

- **INBOX.md** — incoming messages not yet acted on. Each entry is a [FlatfileAgentResourceSystemMessage](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-message.md).
- **PLANS.md** — work items with explicit done conditions. Each entry is a [OperationItem](../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/business-science-services-section/content/text/glossary/terms/operation-item.md).

There is no separate state store — reading INBOX and PLANS gives the full picture.

## Loop closure

Every locale has two loops that must stay closed:

**Triage loop** — INBOX messages → OperationItems in PLANS. Done when INBOX is empty or every message has a corresponding OperationItem.

**Improvement loop** — open OperationItems → completed OperationItems. Done when no open non-blocked OperationItems remain.

A loop is closed when its done condition holds.
Stale OperationItems and unread INBOX messages are worse than ignorance — they actively misdirect.

## Open questions
