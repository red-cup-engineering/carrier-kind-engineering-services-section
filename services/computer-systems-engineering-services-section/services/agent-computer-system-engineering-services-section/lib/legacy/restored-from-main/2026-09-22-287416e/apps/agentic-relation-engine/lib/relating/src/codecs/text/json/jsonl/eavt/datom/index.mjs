/**
 * codecs/text/json/jsonl/eavt/datom - the received/query row: EAVT plus a reading.
 *
 * A JSONL sibling of EAVT (you ASSERT EAVT and RECEIVE Datoms). The object datom
 * `{e,a,v,tx,op}` carries an assert/retract op; folding a datom log yields the
 * current value (CQRS read-model) and the paraconsistent section (present/absent
 * evidence per cell -> potential/active/stable). The implementation lives in the
 * substrate's datom service; this leaf re-publishes its flat names the way the
 * parent `eavt` export re-publishes it as the `datom` namespace.
 */
export {
  datom,
  isDatomShape,
  toDatom,
  parse,
  serialize,
  ASSERT,
  RETRACT,
  assertObjectDatom,
  assertDatomFact,
  retractDatomFact,
  objectDatomId,
  currentDatomValue,
  objectDatomsAsOf,
  foldObjectDatoms,
  objectDatomWitnesses,
  objectDatomStatements,
} from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/services/jsonl-services-section/services/eavt-services-section/services/datom-services-section/src/index.mjs";
