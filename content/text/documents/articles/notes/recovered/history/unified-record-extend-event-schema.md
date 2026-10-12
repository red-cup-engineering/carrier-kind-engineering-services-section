---
name: unified-record-extend-event-schema
specialization: task
date-created: 2026-04-04
plan: ops-integration
task-done: 2026-04-04
status: completed
---

**Implementation:**
- `auto-record-events.js` hook adds resource, commodity, quantity, sourceAccount, destinationAccount for task/plan status transitions (completed, active, blocked, deferred)
- `record-event.js` tool accepts --resource, --commodity, --quantity, --source-account, --destination-account args
- Daemon `record_session_event()` writes resource, commodity, quantity, source, destination for session lifecycle events
- Daemon `record_session_transaction()` writes separate transaction entities with debit/credit accounts for session cost tracking
- `query-events.js --balance` reads accounting attributes and produces trial balance
