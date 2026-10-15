# Exact native request and reply custody

This extends the existing ActivityPub journal and immutable body store. It creates no separate queue, authorization projection or historical index. Native readers use the existing receipt/event keys and semantic request/reply heads. A missing head means no acknowledged correlated reading; a missing record/body, malformed order, closed or multi-frontier exact head refuses. There is no runtime fallback to a whole inbox/outbox scan.

## Authority and order

The request head is named by activityPubRequestHead(requestNi), where requestNi is derived from the verified actor, private recipient, SEN object, agent card and A2A message with only messageId omitted. The held original wire, event and message IDs remain unchanged. The request head fixes that original wire first; the event-key head is then joined or repaired. Concurrent requests return the same winning original wire. Every reused wire is revalidated against its request identity and immutable body.

The reply head is named by activityPubReplyHead({identifier,request,sender}). Every new correlated inbox receipt has scalar replyOrder, a nonnegative safe integer. Winner comparison is raw lexical at, then replyOrder, then the existing receipt key lexically. Timestamp spelling is not normalized; regressed clocks do not replace a greater raw timestamp. Native equal-time semantics are explicitly semantic order, not the old mutable bucket position law.

A new receipt observes the current reply winner and proposes replyOrder + 1, or zero if absent. Exhaustion refuses. Existing receipt-key head compare-and-swap fixes one exact immutable record and ordinal once. Concurrent proposals may share an ordinal, so their existing receipt keys break ties deterministically. The correlation head joins the maximum with exact expected-frontier compare-and-swap, at most two attempts per admission. A conflict after that bound refuses acknowledgment; retrying the same verified receipt joins its original held row rather than allocating a new ordinal. Thus replay of an older receipt cannot promote it past a newer equal-time receipt.

Record-line publication is still native store admission. A crash after put but before receipt-head acknowledgment may leave an immutable orphan visible to ordinary inbox collection reads. It is preserved. This contract guarantees no partial acknowledgment and stable acknowledged receipt/correlation authority, not deletion of historical orphan lines. No record, body or original source tree is discarded to make a test pass.

## Paired receiving requirement

Existing native history must undergo the separate stopped-writer native receiving pass before these readers are activated. The genuine prior reader first establishes original winners: stable raw-at sorting of actual store.each traversal, first matching request and last matching reply. Historical AP versions without requestNi or reply fields do not acquire invented request identities.

Every original inbox occurrence, including duplicate physical valid lines, is retained as received evidence with a unique sourceOrder equal to its original traversal ordinal. All occurrences of one identical receipt get replyOrder equal to that receipt's last original occurrence ordinal. Receipt and reply heads preserve the prior reading. Inbox collections sort raw at then sourceOrder; subsequent native rows without sourceOrder follow received rows at equal time and keep their inherited bucket order among themselves. Correlated replies instead use the explicit semantic comparison above. The original native tree remains immutable and recoverable alongside the candidate. Request first-winner selection is independent of reply last-winner selection.

## Body publication and costs

Before creating a journal record, ActivityPub reads immutable custody back and requires exact bytes and application/json media. The immutable supplier can complete an absent media sidecar for exact existing bytes, but cannot replace an existing sidecar or relabel its accepted media. Conflicting media therefore fails ActivityPub admission before receipt/request records or heads.

Point lookup touches a bounded number of named heads, records and immutable bodies. It does not replay a type. The existing store's one-bucket addressed lookup bounds working memory and number of files, not bytes or elapsed time: bucket cost grows with retained bucket history. This source change does not claim to solve future store partition/compaction obligations. Generic inbox/outbox list APIs retain their existing replay costs and are not invoked by gateway request/result observation.
