# Retain the existing work opening's invocation provenance

Status: bounded source-repair contract; no new authority, formation operation or runtime receiving claim

## Existing owners and causal edge

Computer's governed dispatcher already witnesses the invocation and its matching authorization decision before calling the host's work-open operation. Its process-local execution context carries those actual causal-head event addresses. The work-open handler previously discarded the addresses before passing its player-derived opening through the host's opening port to FeltOS workBoardStore.

Computer owns that handler, the opening/peer ports and replication. FeltOS owns the board journal and replay. Data's existing semantic-record journal owns durable causes and witness querying. Organizing's arena laws and authored identities are unchanged.

## Required behavior

1. A newly recorded opening MUST retain the genuine dispatcher context's pre-effect witness addresses through the existing semantic-journal causes field. Caller-authored work-open causes MUST be refused before the work opening port. Caller by/hand selections retain their existing player-derivation behavior.
2. The authored opening, thread ID, admitted law edition, standing, grants and legality MUST remain unchanged. Causal references are outside the arena move content. An invocation admission decision is not a Leader founding decision or a successful outcome.
3. A repeated opening MUST retain its original record and witnesses. A newer invocation MUST NOT backfill old provenance. Legacy SEAVT rows with no event or cause metadata remain readable and unknown in those respects.
4. A later report observation that the existing law admits as corroboration MUST retain its own cause. It MUST NOT overwrite the original opening's source, player, scope or witnesses.
5. The board's witnessesOf(move) reader MUST return only actual stored witnesses for that exact move. Exact/full native work-board readings expose openingWitnesses; ordinary summaries remain unchanged. No authority is inferred from source URLs, player names or absent evidence.
6. A peer carrier MAY retain cause addresses as transport metadata covered by its existing addressed SEN identity. Empty legacy metadata MUST leave the old carrier unchanged. The receiving node MUST retain offered addresses only as sourceCauses in its existing federated-work-admission witness, together with the signed sender, original CloudEvent subject and existing standing judgment. The board row MUST follow that receiving node's actual admission event, rather than treating unavailable foreign witnesses as local predecessors. Missing foreign proof remains missing.
7. Existing peer standing admission, exact opening identity checks, held-delivery behavior, failures, replay and catch-up receiving MUST remain intact. Catch-up reads stored causes; it does not invent a newer invocation or declare prior delivery received. No new peer/grant, credential, deployment or data-root selection is introduced.
8. A work row that survives an interrupted RPC outcome does not establish successful RPC receiving. Future consumers must resolve the actual original attempt, matching decision and outcome as needed. This repair supplies no permissive repository-formation resolver and executes no provider formation.

## Real provider qualification

FeltOS test/work-board-provenance.test.mjs exercises the actual dispatcher, journalRpcWitness, semantic-record journal, workBoardStore, fresh replay and RPC journal reader using disposable fixture state. Its seven cases cover exact decision linkage; unchanged authored identity; historical replay; denied standing with zero board effects; interrupted outcome; new report corroboration; caller-move metadata exclusion; and literal legacy SEAVT rows. Fixture admission is not native account/office recognition.

Computer's test/work-open-provenance.test.mjs exercises the actual work-open handler and hosted/peer opening ports, exact native readback, sourceCauses separation, historical replay, catch-up and denied standing with disposable fixture peers. These five cases require the genuine generated MetroPlat operation-family descriptors and English bundle in the build closure. Missing generated outputs must not be replaced with a placeholder authority catalogue. Source checks and local provider tests do not prove installation or historical founding intent.

## Review regression requirements

A repeated exact authored move remains one work-board fact even when received through distinct
admission witnesses or before its opening. Every admission remains independently readable; only
another identical work row is suppressed. Changed authored content or time remains a distinct
move. Unknown-edition peer moves receive the same exact-content replay protection without being
judged under a newly inferred law.

Witness lookup may match a stored move with no edition to the exact opening read under the
sixteenth edition, the existing arena reader's explicit historical rule. Every other field must
match. An explicit different edition, changed content, added field or changed time must not gain
that witness. Returned witness metadata is the raw historical record, never backfilled.

## Exact replay source identity

The existing Organizing work-arena reader now retains an opening source only at the transition
that actually creates its accepted thread. The source is the raw semantic-record id and, when
present, its event address. Refused, unread and duplicate openings cannot replace it. Source
identity remains outside authored moves and the game position. Prefix rebuilds account for
record ids and events; returned source snapshots are immutable.

FeltOS binds openings returned by read/find and existing-opening play to that actual selected
source. Their witness lookup returns only the source row's unchanged metadata, including no
fabricated event for a legacy row. A fresh reader repeats the same actual replay. A detached
normalized value that matches multiple raw source ids raises WORK_BOARD_WITNESS_AMBIGUOUS;
it is not reported as zero witnesses. rawWitnessesOf reads exact stored bytes without claiming
that replay selected them. A stored no-edition move and separately stored explicit-sixteenth
move remain distinct raw records, even when their normalized openings are identical.

This extends the actual Organizing replay owner and its tests because the previous API discarded
source identity. It does not add a law, admission, authorization or historical migration.
