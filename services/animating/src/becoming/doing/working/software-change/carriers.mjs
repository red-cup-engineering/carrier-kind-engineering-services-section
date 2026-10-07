/** Generated from specifications/*.schema.json. Do not edit. */
import { defineSchemaType } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/schema-type";
export const artifactSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.artifact.v2",
  "title": "aoe.software.artifact.v2",
  "description": "A software artifact identified by its content, independent of location",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "digest",
    "kind"
  ],
  "properties": {
    "digest": {
      "type": "string",
      "minLength": 1
    },
    "kind": {
      "type": "string",
      "minLength": 1
    },
    "length": {
      "type": "integer",
      "minimum": 0
    }
  },
  "x-codegen": {
    "exportName": "artifactSchema",
    "typeName": "Artifact",
    "runtimeName": "artifactType"
  }
});

export const consumerSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.consumer.v1",
  "title": "aoe.software.consumer.v1",
  "description": "An affected consumer declared by software-change work",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "name"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    }
  },
  "x-codegen": {
    "exportName": "consumerSchema",
    "typeName": "Consumer",
    "runtimeName": "consumerType"
  }
});

export const locationSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.location.v1",
  "title": "aoe.software.location.v1",
  "description": "A path at which a software artifact is observed or projected",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "path"
  ],
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1
    }
  },
  "x-codegen": {
    "exportName": "locationSchema",
    "typeName": "Location",
    "runtimeName": "locationType"
  }
});

export const ownerSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.owner.v2",
  "title": "aoe.software.owner.v2",
  "description": "A declared software capability owner or instance",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "name",
    "kind"
  ],
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    },
    "kind": {
      "type": "string",
      "enum": [
        "engine",
        "component",
        "module",
        "application",
        "platform",
        "service",
        "instance"
      ]
    }
  },
  "x-codegen": {
    "exportName": "ownerSchema",
    "typeName": "Owner",
    "runtimeName": "ownerType"
  }
});

export const placementSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.placement.v2",
  "title": "aoe.software.placement.v2",
  "description": "A declared capability placement for software-change work",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "capability",
    "effect",
    "carrier",
    "ownerBefore",
    "ownerBeforeKind",
    "ownerAfter",
    "ownerAfterKind",
    "reason",
    "consumers",
    "observation"
  ],
  "properties": {
    "capability": {
      "type": "string",
      "minLength": 1
    },
    "effect": {
      "type": "string",
      "minLength": 1
    },
    "carrier": {
      "type": "string",
      "minLength": 1
    },
    "ownerBefore": {
      "type": "string",
      "minLength": 1
    },
    "ownerBeforeKind": {
      "type": "string",
      "enum": [
        "engine",
        "component",
        "module",
        "application",
        "platform",
        "service",
        "instance"
      ]
    },
    "ownerAfter": {
      "type": "string",
      "minLength": 1
    },
    "ownerAfterKind": {
      "type": "string",
      "enum": [
        "engine",
        "component",
        "module",
        "application",
        "platform",
        "service"
      ]
    },
    "reason": {
      "type": "string",
      "minLength": 1
    },
    "consumers": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "observation": {
      "type": "string",
      "minLength": 1
    }
  },
  "x-codegen": {
    "exportName": "placementSchema",
    "typeName": "Placement",
    "runtimeName": "placementType"
  }
});

export const workSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.work.v1",
  "title": "aoe.software.work.v1",
  "description": "An admitted software-change work intent",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "operation",
    "actor",
    "request"
  ],
  "properties": {
    "operation": {
      "type": "string",
      "minLength": 1
    },
    "actor": {
      "type": "string",
      "minLength": 1
    },
    "request": {
      "type": "object"
    }
  },
  "x-codegen": {
    "exportName": "workSchema",
    "typeName": "Work",
    "runtimeName": "workType"
  }
});

export const artifactType = defineSchemaType(artifactSchema);
export const consumerType = defineSchemaType(consumerSchema);
export const locationType = defineSchemaType(locationSchema);
export const ownerType = defineSchemaType(ownerSchema);
export const placementType = defineSchemaType(placementSchema);
export const workType = defineSchemaType(workSchema);
