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

export const developmentProductRequestSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe/software/development/product-request",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "question",
    "artifact"
  ],
  "properties": {
    "question": {
      "type": "string",
      "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{43}$"
    },
    "artifact": {
      "type": "string",
      "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{43}$"
    },
    "offset": {
      "type": "integer",
      "minimum": 0
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 131072
    },
    "projection": {
      "enum": [
        "product",
        "source-text"
      ]
    }
  },
  "x-codegen": {
    "exportName": "developmentProductRequestSchema",
    "typeName": "DevelopmentProductRequest",
    "runtimeName": "developmentProductRequestType"
  },
  "title": "DevelopmentProductRequest",
  "description": "An exact addressed product in native custody with a bounded byte window, or an explicit source-text projection measured in Unicode codepoints"
});

export const developmentRequestSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe/software/development/request",
  "type": "object",
  "required": [
    "objective",
    "work"
  ],
  "additionalProperties": false,
  "properties": {
    "objective": {
      "type": "string",
      "minLength": 1
    },
    "constraints": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "work": {
      "type": "string",
      "minLength": 1
    },
    "workType": {
      "enum": [
        "inquiry",
        "software-change"
      ]
    },
    "artifacts": {
      "type": "object"
    },
    "resume": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "question",
        "effect"
      ],
      "properties": {
        "question": {
          "type": "string",
          "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{43}$"
        },
        "effect": {
          "type": "string",
          "pattern": "^ni:///sha-256;[A-Za-z0-9_-]{43}$"
        }
      }
    },
    "revision": {
      "type": "string",
      "minLength": 1,
      "description": "The exact authored requirement revision selected by the requesting actor"
    }
  },
  "x-codegen": {
    "exportName": "developmentRequestSchema",
    "typeName": "DevelopmentRequest",
    "runtimeName": "developmentRequestType"
  },
  "title": "DevelopmentRequest",
  "description": "Intent addressed to a development actor; authority remains receiver-owned"
});

export const engineeringArtifactSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.development.artifact.v2",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "role",
    "text",
    "inputs",
    "unresolved",
    "basis",
    "authority",
    "derivation",
    "readings",
    "admission",
    "semanticProof"
  ],
  "properties": {
    "role": {
      "enum": [
        "prior-art-synthesis",
        "system-operational-concept",
        "software-requirements-specification",
        "software-architecture-specification",
        "high-level-design",
        "low-level-design",
        "artifact-specifications"
      ]
    },
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 65536
    },
    "inputs": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "unresolved": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "product": {
      "type": "object"
    },
    "basis": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "authority": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "derivation": {
      "type": "object"
    },
    "readings": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "admission": {
      "const": "machine-grounded-contribution"
    },
    "semanticProof": {
      "const": "unestablished"
    }
  },
  "x-codegen": {
    "exportName": "engineeringArtifactSchema",
    "typeName": "EngineeringArtifact",
    "runtimeName": "engineeringArtifactType"
  },
  "title": "EngineeringArtifact",
  "description": "A causally grounded engineering product consumed by the next development transformation"
});

export const engineeringContributionSchema = Object.freeze({
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aoe.software.development.contribution.v1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "role",
    "text",
    "unresolved"
  ],
  "properties": {
    "role": {
      "enum": [
        "prior-art-synthesis",
        "system-operational-concept",
        "software-requirements-specification",
        "software-architecture-specification",
        "high-level-design",
        "low-level-design",
        "artifact-specifications"
      ]
    },
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 65536
    },
    "unresolved": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "product": {
      "type": "object"
    }
  },
  "x-codegen": {
    "exportName": "engineeringContributionSchema",
    "typeName": "EngineeringContribution",
    "runtimeName": "engineeringContributionType"
  },
  "title": "EngineeringContribution",
  "description": "Inferential content consumed by development; causal identities and authority are established by the engine"
});

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
export const developmentProductRequestType = defineSchemaType(developmentProductRequestSchema);
export const developmentRequestType = defineSchemaType(developmentRequestSchema);
export const engineeringArtifactType = defineSchemaType(engineeringArtifactSchema);
export const engineeringContributionType = defineSchemaType(engineeringContributionSchema);
export const fabricationRefusalType = defineSchemaType(fabricationRefusalSchema);
export const locationType = defineSchemaType(locationSchema);
export const ownerType = defineSchemaType(ownerSchema);
export const placementType = defineSchemaType(placementSchema);
export const workType = defineSchemaType(workSchema);
