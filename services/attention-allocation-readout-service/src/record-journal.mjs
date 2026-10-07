import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

const OBJECT_KIND = "lenticule.attention-allocation-readout.journal-record";
const SUPPORT_ONLY = Object.freeze({ for: true, against: false });

/**
 * Provider-owned custody for this service's ActivityStreams evidence.
 * Categories and record payloads stay in the service contract; the journal
 * merely gives each admitted record durable, content-addressed custody.
 */
export function createAttentionAllocationRecordJournal({ root }) {
  const journal = createSemanticRecordJournal({ root, objectKind: OBJECT_KIND });
  return Object.freeze({
    record({ category, recordedAt, record }) {
      return journal.record({ category, recordedAt, record, told: SUPPORT_ONLY });
    },
  });
}
