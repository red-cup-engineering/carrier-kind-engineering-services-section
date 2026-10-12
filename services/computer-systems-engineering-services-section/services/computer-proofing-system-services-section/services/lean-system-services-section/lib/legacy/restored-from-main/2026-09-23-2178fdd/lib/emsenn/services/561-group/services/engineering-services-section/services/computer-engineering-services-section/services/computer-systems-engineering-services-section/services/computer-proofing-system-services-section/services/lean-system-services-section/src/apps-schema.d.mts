
export declare const appOpticDescriptorSchema: {
    readonly $id: "metroplat/apps/optic";
    readonly title: "AppOpticDescriptor";
    readonly description: "An authored app optic: a chosen workbench, inspector, atlas, cockpit, visual field, or workflow over admitted package material.";
    readonly type: "object";
    readonly required: readonly ["kind", "id", "app", "optic", "mode", "domain", "codomain", "evidence"];
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.apps.optic";
        };
        readonly id: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly app: {
            readonly enum: readonly ["blueprint", "verso"];
        };
        readonly optic: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly mode: {
            readonly enum: readonly ["workbench", "inspector", "atlas", "cockpit", "visual-field", "workflow"];
        };
        readonly domain: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly codomain: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly evidence: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const appOpticRegistrySchema: {
    readonly $id: "metroplat/apps/optic-registry";
    readonly title: "AppOpticRegistry";
    readonly description: "The package-level atlas of authored app optics exposed from apps/ without making src/ import app modules.";
    readonly type: "object";
    readonly required: readonly ["kind", "package", "optics", "evidence"];
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.apps.optic-registry";
        };
        readonly package: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly optics: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/apps/optic";
                readonly title: "AppOpticDescriptor";
                readonly description: "An authored app optic: a chosen workbench, inspector, atlas, cockpit, visual field, or workflow over admitted package material.";
                readonly type: "object";
                readonly required: readonly ["kind", "id", "app", "optic", "mode", "domain", "codomain", "evidence"];
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.apps.optic";
                    };
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly app: {
                        readonly enum: readonly ["blueprint", "verso"];
                    };
                    readonly optic: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly mode: {
                        readonly enum: readonly ["workbench", "inspector", "atlas", "cockpit", "visual-field", "workflow"];
                    };
                    readonly domain: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly codomain: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly evidence: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                };
                readonly additionalProperties: false;
            };
        };
        readonly evidence: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const blueprintAppDocumentSchema: {
    readonly $id: "metroplat/apps/blueprint/document";
    readonly title: "BlueprintAppDocument";
    readonly description: "Authored Blueprint claim-frontier optic over an admitted Blueprint claim graph.";
    readonly type: "object";
    readonly required: readonly ["kind", "optic", "sources", "settled", "frontier", "unstated", "missingDependencies", "sections", "edges", "evidence"];
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.apps.blueprint.document";
        };
        readonly optic: {
            readonly const: "blueprint-claim-frontier";
        };
        readonly sources: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly settled: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly frontier: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly unstated: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly missingDependencies: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly sections: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["status", "nodes"];
                readonly properties: {
                    readonly status: {
                        readonly enum: readonly ["settled", "frontier", "unstated"];
                    };
                    readonly nodes: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly required: readonly ["id", "statementKind", "status", "source", "line", "leanDeclarations", "uses", "usedBy"];
                            readonly properties: {
                                readonly id: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly title: {
                                    readonly type: "string";
                                };
                                readonly statementKind: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly status: {
                                    readonly enum: readonly ["settled", "frontier", "unstated"];
                                };
                                readonly source: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly line: {
                                    readonly type: "integer";
                                    readonly minimum: 1;
                                };
                                readonly leanDeclarations: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                };
                                readonly uses: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                };
                                readonly usedBy: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                };
                            };
                            readonly additionalProperties: false;
                        };
                    };
                };
                readonly additionalProperties: false;
            };
        };
        readonly edges: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["from", "to", "relationship", "source", "line"];
                readonly properties: {
                    readonly from: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly to: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly relationship: {
                        readonly const: "uses";
                    };
                    readonly source: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                };
                readonly additionalProperties: false;
            };
        };
        readonly evidence: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const versoAppDocumentSchema: {
    readonly $id: "metroplat/apps/verso/document";
    readonly title: "VersoAppDocument";
    readonly description: "Authored Verso exposition-weld optic over an admitted Verso weld report.";
    readonly type: "object";
    readonly required: readonly ["kind", "optic", "sources", "imports", "includes", "theoremReferences", "claimOccurrences", "blueprintNodes", "checkedLeanBlocks", "checks", "ok", "obstructions", "evidence"];
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.apps.verso.document";
        };
        readonly optic: {
            readonly const: "verso-exposition-weld";
        };
        readonly sources: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly imports: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly includes: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly theoremReferences: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly claimOccurrences: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly blueprintNodes: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly checkedLeanBlocks: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly checks: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["name", "checked", "missing"];
                readonly properties: {
                    readonly name: {
                        readonly enum: readonly ["lean-catalog", "blueprint-graph"];
                    };
                    readonly checked: {
                        readonly type: "boolean";
                    };
                    readonly missing: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                };
                readonly additionalProperties: false;
            };
        };
        readonly ok: {
            readonly type: "boolean";
        };
        readonly obstructions: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly evidence: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
    };
    readonly additionalProperties: false;
};
export type AppOpticDescriptor = FromJsonSchema<typeof appOpticDescriptorSchema>;
export type AppOpticRegistry = FromJsonSchema<typeof appOpticRegistrySchema>;
export type BlueprintAppDocument = FromJsonSchema<typeof blueprintAppDocumentSchema>;
export type VersoAppDocument = FromJsonSchema<typeof versoAppDocumentSchema>;
export declare const appOpticDescriptorContract: any;
export declare const appOpticRegistryContract: any;
export declare const blueprintAppDocumentContract: any;
export declare const versoAppDocumentContract: any;
