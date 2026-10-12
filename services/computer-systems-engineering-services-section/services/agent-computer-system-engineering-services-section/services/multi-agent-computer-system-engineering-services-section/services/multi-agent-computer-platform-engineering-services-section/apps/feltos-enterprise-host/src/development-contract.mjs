/** Generated from specifications/*.schema.json. Do not edit. */
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
export const developmentReceivingSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "feltos/software/development/receiving",
  "title": "DevelopmentReceiving",
  "description": "Host-owned development effect and receiving conditions carried by an authored requirement",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "office",
    "objective",
    "territory",
    "writablePaths",
    "readablePaths",
    "verifyCommand",
    "acceptanceCommand"
  ],
  "properties": {
    "office": {
      "type": "string",
      "minLength": 1
    },
    "scope": {
      "type": "string",
      "minLength": 1
    },
    "objective": {
      "type": "string",
      "minLength": 1
    },
    "territory": {
      "type": "string",
      "minLength": 1
    },
    "workType": {
      "enum": [
        "inquiry",
        "software-change"
      ]
    },
    "constraints": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "writablePaths": {
      "type": "array",
      "maxItems": 128,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "readablePaths": {
      "type": "array",
      "maxItems": 128,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "verifyCommand": {
      "type": "string",
      "minLength": 1
    },
    "acceptanceCommand": {
      "type": "string",
      "minLength": 1
    },
    "sourceBase": {
      "type": "string",
      "pattern": "^(?:[a-f0-9]{40}|[a-f0-9]{64})$",
      "description": "Original immutable Git source before the entire intended software delivery"
    }
  },
  "x-codegen": {
    "exportName": "developmentReceivingSchema",
    "typeName": "DevelopmentReceiving",
    "runtimeName": "developmentReceivingType"
  },
  "allOf": [
    {
      "if": {
        "not": {
          "properties": {
            "workType": {
              "const": "inquiry"
            }
          },
          "required": [
            "workType"
          ]
        }
      },
      "then": {
        "required": [
          "sourceBase"
        ]
      }
    }
  ]
});

export const developmentReceivingType = defineSchemaType(developmentReceivingSchema);
