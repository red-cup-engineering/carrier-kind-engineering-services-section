/** Generated from specifications/*.schema.json. Do not edit. */
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
export const fabricationRefusalSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe/software/development/fabrication-refusal",
  "title": "DevelopmentFabricationRefusal",
  "description": "Native fabrication counterexample retained as an input to executable specification revision",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "source",
    "specification",
    "phase",
    "fingerprint",
    "reason",
    "code",
    "product"
  ],
  "properties": {
    "source": {
      "type": "string",
      "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$(?![\\s\\S])"
    },
    "specification": {
      "type": "string",
      "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$(?![\\s\\S])"
    },
    "phase": {
      "enum": [
        "native-handoff",
        "module-plan",
        "module-derivation"
      ]
    },
    "fingerprint": {
      "type": "string",
      "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$(?![\\s\\S])"
    },
    "reason": {
      "type": "string",
      "minLength": 1
    },
    "code": {
      "type": "string",
      "minLength": 1
    },
    "product": {}
  },
  "x-codegen": {
    "exportName": "fabricationRefusalSchema",
    "typeName": "DevelopmentFabricationRefusal",
    "runtimeName": "fabricationRefusalType"
  }
});

export const fabricationRefusalType = defineSchemaType(fabricationRefusalSchema);