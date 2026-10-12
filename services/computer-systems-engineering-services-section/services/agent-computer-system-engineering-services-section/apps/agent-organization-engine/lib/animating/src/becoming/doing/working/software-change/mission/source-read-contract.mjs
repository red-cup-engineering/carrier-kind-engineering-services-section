/** Generated from specifications/*.schema.json. Do not edit. */
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
export const sourceReadRequestSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe/software/development/source-read-request",
  "title": "DevelopmentSourceReadRequest",
  "description": "An admitted source identity or canonical host locator and bounded Unicode view; identity selects the exact source version",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "pattern": "^(?!\\.{1,2}(?:/|$))[^/\\\\\\u0000]+(?:/(?!\\.{1,2}(?:/|$))[^/\\\\\\u0000]+)*$(?![\\s\\S])"
    },
    "id": {
      "type": "string",
      "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$(?![\\s\\S])"
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9007199254740991
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 16384
    }
  },
  "x-codegen": {
    "exportName": "sourceReadRequestSchema",
    "typeName": "DevelopmentSourceReadRequest",
    "runtimeName": "sourceReadRequestType"
  },
  "anyOf": [
    {
      "required": [
        "path"
      ]
    },
    {
      "required": [
        "id"
      ]
    }
  ]
});

export const sourceReadRequestType = defineSchemaType(sourceReadRequestSchema);