/** Generated from specifications/*.schema.json, plus two local $ref-resolution copies.
 *
 * receiptSchema and refusalSchema $ref evidence.schema.json (owned by
 * @red-cup-engineering/metrologic); receiptSchema also $refs an address definition inside
 * the Actor schema (owned by @red-cup-engineering/feltos; there is no
 * specifications/actor.schema.json in any package to regenerate it from). Per the house
 * dependency direction, computer-system-engine imports nothing from metrologic or feltos,
 * so this module embeds frozen copies of those two schemas as unexported local consts,
 * used only as inert $ref-resolution context passed into defineSchemaType's `references`
 * array (schema-type.mjs treats `references` as plain data, never a live binding -- see
 * that file). The canonical, exported copies live in metrologic's semantic-carriers.mjs
 * (evidenceSchema) and feltos's specification-declarations.mjs (actorSchema); this file was
 * hand-split from computer-data-engine's generated/specification-declarations.mjs on
 * 2026-09-22. The former local generator could not reproduce this module: none of this
 * package's schemas declares x-codegen, and its cross-package references need explicit
 * input identities. It was retired; this file remains a hand-maintained compatibility
 * carrier until those references are specified and generated through AOE work. */
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";

const evidenceSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/evidence.schema.json",
    "title": "Evidence",
    "description": "An observed or sourced carrier. Evidence supports a claim or relation witness; it never silently establishes truth or authority.",
    "type": "object",
    "required": [
        "kind",
        "source",
        "observedAt",
        "content",
        "provenance"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "evidence"
        },
        "source": {
            "type": "string",
            "minLength": 1
        },
        "observedAt": {
            "type": "string",
            "format": "date-time"
        },
        "content": {
            "type": "object"
        },
        "provenance": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "string",
                "minLength": 1
            }
        }
    }
});

const actorSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://561.group/schema/computer-data/actor",
    "title": "Actor",
    "description": "The single Actor carrier. Actor identity is an EAVT constitution whose address is actor:<RFC6920 digest>; all office, principal, credential, resource, session, and application relations remain separate EAVT rows addressed to that Actor.",
    "oneOf": [
        {
            "$ref": "#/$defs/genesis"
        },
        {
            "$ref": "#/$defs/record"
        }
    ],
    "$defs": {
        "address": {
            "type": "string",
            "pattern": "^actor:[A-Za-z0-9_-]+$"
        },
        "row": {
            "type": "object",
            "required": [
                "e",
                "a",
                "v",
                "t"
            ],
            "additionalProperties": false,
            "properties": {
                "e": {
                    "type": [
                        "string",
                        "null"
                    ]
                },
                "a": {
                    "type": "string"
                },
                "v": {},
                "t": {}
            }
        },
        "genesis": {
            "allOf": [
                {
                    "$ref": "#/$defs/row"
                },
                {
                    "properties": {
                        "e": {
                            "$ref": "#/$defs/address"
                        },
                        "a": {
                            "const": "constituted"
                        },
                        "v": {
                            "type": "object"
                        }
                    }
                }
            ]
        },
        "record": {
            "type": "object",
            "required": [
                "address",
                "genesisRow",
                "attributes",
                "t",
                "names",
                "supersedes"
            ],
            "additionalProperties": false,
            "properties": {
                "address": {
                    "$ref": "#/$defs/address"
                },
                "genesisRow": {
                    "$ref": "#/$defs/genesis"
                },
                "attributes": {
                    "type": "object"
                },
                "t": {},
                "names": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "uniqueItems": true
                },
                "supersedes": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "uniqueItems": true
                }
            }
        }
    }
});

export const receiptSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/receipt.schema.json",
    "title": "Receipt",
    "description": "Receiver-produced evidence that a named effect or delivery condition occurred. A provider's report is not a receipt.",
    "type": "object",
    "required": [
        "kind",
        "effect",
        "receiver",
        "evidence"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "receipt"
        },
        "effect": {
            "type": "string",
            "minLength": 1
        },
        "receiver": {
            "$ref": "https://561.group/schema/computer-data/actor#/$defs/address"
        },
        "evidence": {
            "$ref": "evidence.schema.json"
        }
    }
});

export const refusalSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/refusal.schema.json",
    "title": "Refusal",
    "description": "A typed non-admission or non-delivery outcome naming the condition and its evidence. It never becomes an exception-shaped hidden state.",
    "type": "object",
    "required": [
        "kind",
        "code",
        "message",
        "evidence"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "refusal"
        },
        "code": {
            "type": "string",
            "minLength": 1
        },
        "message": {
            "type": "string",
            "minLength": 1
        },
        "evidence": {
            "$ref": "evidence.schema.json"
        }
    }
});

export const resourceSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/resource.schema.json",
    "title": "Resource",
    "description": "An addressable, classed, provenance-carrying resource. Resource observations, reservations, allocations, consumption, and release are relations over this one term.",
    "type": "object",
    "required": [
        "kind",
        "address",
        "resourceClass",
        "provenance"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "resource"
        },
        "address": {
            "type": "string",
            "minLength": 1
        },
        "resourceClass": {
            "type": "string",
            "minLength": 1
        },
        "provenance": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "string",
                "minLength": 1
            }
        }
    }
});

export const ruleSchema = Object.freeze({
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://schemas.561.group/computer/rule.schema.json",
    "title": "Rule",
    "description": "A source-provenanced normative constraint applied conjunctively with every non-superseded, in-scope Founder Direction.",
    "type": "object",
    "required": [
        "kind",
        "statement",
        "provenance"
    ],
    "additionalProperties": false,
    "properties": {
        "kind": {
            "const": "rule"
        },
        "statement": {
            "type": "string",
            "minLength": 1
        },
        "provenance": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "string",
                "minLength": 1
            }
        }
    }
});

export const receiptType = defineSchemaType(receiptSchema, [actorSchema, evidenceSchema]);
export const refusalType = defineSchemaType(refusalSchema, [evidenceSchema]);
export const resourceType = defineSchemaType(resourceSchema);
export const ruleType = defineSchemaType(ruleSchema);
