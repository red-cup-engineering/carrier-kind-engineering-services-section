
export declare const blueprintTexClaimOccurrenceSchema: {
    readonly $id: "metroplat/tex/blueprint-claim-occurrence";
    readonly title: "BlueprintTexClaimOccurrence";
    readonly description: "A Blueprint TeX claim occurrence with Lean witness incidence and dependency edges.";
    readonly type: "object";
    readonly required: readonly ["kind", "label", "statementKind", "leanDeclarations", "status", "dependencies", "line"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.blueprint.claim-occurrence";
        };
        readonly label: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly statementKind: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly title: {
            readonly type: "string";
        };
        readonly leanDeclarations: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly status: {
            readonly enum: readonly ["settled", "frontier", "unstated"];
        };
        readonly dependencies: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly line: {
            readonly type: "integer";
            readonly minimum: 1;
        };
    };
};
export type BlueprintTexClaimOccurrence = FromJsonSchema<typeof blueprintTexClaimOccurrenceSchema>;
export declare const blueprintTexClaimOccurrenceContract: any;
export declare const blueprintTexPlateSchema: {
    readonly $id: "metroplat/tex/blueprint-plate";
    readonly title: "BlueprintTexPlate";
    readonly description: "A Blueprint TeX plate admitted as claim-occurrence incidence, not as an app or build runtime.";
    readonly type: "object";
    readonly required: readonly ["kind", "source", "tex", "claimOccurrences"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.blueprint-plate";
        };
        readonly source: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly tex: any;
        readonly claimOccurrences: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/tex/blueprint-claim-occurrence";
                readonly title: "BlueprintTexClaimOccurrence";
                readonly description: "A Blueprint TeX claim occurrence with Lean witness incidence and dependency edges.";
                readonly type: "object";
                readonly required: readonly ["kind", "label", "statementKind", "leanDeclarations", "status", "dependencies", "line"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.tex.blueprint.claim-occurrence";
                    };
                    readonly label: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly statementKind: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly leanDeclarations: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                    readonly status: {
                        readonly enum: readonly ["settled", "frontier", "unstated"];
                    };
                    readonly dependencies: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                };
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type BlueprintTexPlate = FromJsonSchema<typeof blueprintTexPlateSchema>;
export declare const blueprintTexPlateContract: any;
export declare const versoTexPlateSchema: {
    readonly $id: "metroplat/tex/verso-plate";
    readonly title: "VersoTexPlate";
    readonly description: "A Verso authoring plate admitted as exposition welds among imports, includes, Lean declarations, claim-occurrences, and Blueprint nodes.";
    readonly type: "object";
    readonly required: readonly ["kind", "source", "tex", "imports", "includes", "leanDeclarations", "claimOccurrences", "blueprintNodes", "checkedLeanBlocks"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.verso-plate";
        };
        readonly source: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly tex: any;
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
        readonly leanDeclarations: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type VersoTexPlate = FromJsonSchema<typeof versoTexPlateSchema>;
export declare const versoTexPlateContract: any;
export declare const texToolReportSchema: {
    readonly $id: "metroplat/tex/tool-report";
    readonly title: "TexToolReport";
    readonly description: "A TeX-family runtime/tool command observation returned from a service boundary.";
    readonly type: "object";
    readonly required: readonly ["kind", "tool", "command", "args", "exitCode", "stdout", "stderr", "succeeded", "errors", "warnings"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.tool-report";
        };
        readonly tool: {
            readonly enum: readonly ["tex-engine", "blueprint-tool", "verso-tool"];
        };
        readonly command: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly args: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly exitCode: {
            readonly type: "integer";
        };
        readonly stdout: {
            readonly type: "string";
        };
        readonly stderr: {
            readonly type: "string";
        };
        readonly succeeded: {
            readonly type: "boolean";
        };
        readonly errors: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly warnings: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type TexToolReport = FromJsonSchema<typeof texToolReportSchema>;
export declare const texToolReportContract: any;
export declare const texWorkspaceSourceSchema: {
    readonly type: "object";
    readonly required: readonly ["path", "text"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly path: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly text: {
            readonly type: "string";
        };
    };
};
export type TexWorkspaceSource = FromJsonSchema<typeof texWorkspaceSourceSchema>;
export declare const texWorkspaceReadRequestSchema: {
    readonly $id: "metroplat/services/tex-workspace/read-request";
    readonly title: "TexWorkspaceReadRequest";
    readonly description: "A filesystem-bounded request to admit TeX, Blueprint-TeX, and Verso authoring files as plates.";
    readonly type: "object";
    readonly required: readonly ["kind", "root"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.workspace-read-request";
        };
        readonly root: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly maxDepth: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly ignore: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly texRoots: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly blueprintRoots: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly versoRoots: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly at: {};
        readonly caller: {};
    };
};
export type TexWorkspaceReadRequest = FromJsonSchema<typeof texWorkspaceReadRequestSchema>;
export declare const texWorkspaceReadRequestContract: any;
export declare const texWorkspaceReadSchema: {
    readonly $id: "metroplat/services/tex-workspace/read";
    readonly title: "TexWorkspaceRead";
    readonly description: "A TeX-family workspace admitted as file plates plus Blueprint and Verso package projections with service boundary evidence.";
    readonly type: "object";
    readonly required: readonly ["kind", "operation", "root", "texSources", "blueprintSources", "versoSources", "texPlates", "blueprintPlates", "versoPlates", "blueprintClaimGraph", "versoExpositionWeldReport"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.workspace";
        };
        readonly operation: {
            readonly const: "read-tex-workspace";
        };
        readonly root: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly texSources: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["path", "text"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly text: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly blueprintSources: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["path", "text"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly text: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly versoSources: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["path", "text"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly text: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly texPlates: {
            readonly type: "array";
            readonly items: any;
        };
        readonly blueprintPlates: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/tex/blueprint-plate";
                readonly title: "BlueprintTexPlate";
                readonly description: "A Blueprint TeX plate admitted as claim-occurrence incidence, not as an app or build runtime.";
                readonly type: "object";
                readonly required: readonly ["kind", "source", "tex", "claimOccurrences"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.tex.blueprint-plate";
                    };
                    readonly source: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly tex: any;
                    readonly claimOccurrences: {
                        readonly type: "array";
                        readonly items: {
                            readonly $id: "metroplat/tex/blueprint-claim-occurrence";
                            readonly title: "BlueprintTexClaimOccurrence";
                            readonly description: "A Blueprint TeX claim occurrence with Lean witness incidence and dependency edges.";
                            readonly type: "object";
                            readonly required: readonly ["kind", "label", "statementKind", "leanDeclarations", "status", "dependencies", "line"];
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly kind: {
                                    readonly const: "metroplat.tex.blueprint.claim-occurrence";
                                };
                                readonly label: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly statementKind: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly title: {
                                    readonly type: "string";
                                };
                                readonly leanDeclarations: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                };
                                readonly status: {
                                    readonly enum: readonly ["settled", "frontier", "unstated"];
                                };
                                readonly dependencies: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                        readonly minLength: 1;
                                    };
                                };
                                readonly line: {
                                    readonly type: "integer";
                                    readonly minimum: 1;
                                };
                            };
                        };
                    };
                    readonly mediaType: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly versoPlates: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/tex/verso-plate";
                readonly title: "VersoTexPlate";
                readonly description: "A Verso authoring plate admitted as exposition welds among imports, includes, Lean declarations, claim-occurrences, and Blueprint nodes.";
                readonly type: "object";
                readonly required: readonly ["kind", "source", "tex", "imports", "includes", "leanDeclarations", "claimOccurrences", "blueprintNodes", "checkedLeanBlocks"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.tex.verso-plate";
                    };
                    readonly source: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly tex: any;
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
                    readonly leanDeclarations: {
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
                    readonly mediaType: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly blueprintClaimGraph: any;
        readonly versoExpositionWeldReport: any;
    };
};
export declare const texWorkspaceReadContract: any;
export type TexWorkspaceRead = FromJsonSchema<typeof texWorkspaceReadSchema>;
export declare const texWorkspaceToolObservationRequestSchema: {
    readonly $id: "metroplat/services/tex-workspace/tool-observation-request";
    readonly title: "TexWorkspaceToolObservationRequest";
    readonly description: "A filesystem-bounded request to run one TeX-family tool as a service-owned instrument observation.";
    readonly type: "object";
    readonly required: readonly ["kind", "root", "tool"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.workspace-tool-observation-request";
        };
        readonly root: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly tool: {
            readonly enum: readonly ["tex-engine", "blueprint-tool", "verso-tool"];
        };
        readonly command: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly args: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly at: {};
        readonly caller: {};
    };
};
export type TexWorkspaceToolObservationRequest = FromJsonSchema<typeof texWorkspaceToolObservationRequestSchema>;
export declare const texWorkspaceToolObservationRequestContract: any;
export declare const texWorkspaceToolObservationSchema: {
    readonly $id: "metroplat/services/tex-workspace/tool-observation";
    readonly title: "TexWorkspaceToolObservation";
    readonly description: "A TeX, Blueprint, or Verso runtime/tool report wrapped as a contract-lensed service boundary observation.";
    readonly type: "object";
    readonly required: readonly ["kind", "operation", "root", "report"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.tex.workspace-tool-observation";
        };
        readonly operation: {
            readonly enum: readonly ["run-tex-workspace-command", "run-blueprint-workspace-command", "run-verso-workspace-command"];
        };
        readonly root: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly report: {
            readonly $id: "metroplat/tex/tool-report";
            readonly title: "TexToolReport";
            readonly description: "A TeX-family runtime/tool command observation returned from a service boundary.";
            readonly type: "object";
            readonly required: readonly ["kind", "tool", "command", "args", "exitCode", "stdout", "stderr", "succeeded", "errors", "warnings"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.tex.tool-report";
                };
                readonly tool: {
                    readonly enum: readonly ["tex-engine", "blueprint-tool", "verso-tool"];
                };
                readonly command: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly args: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly exitCode: {
                    readonly type: "integer";
                };
                readonly stdout: {
                    readonly type: "string";
                };
                readonly stderr: {
                    readonly type: "string";
                };
                readonly succeeded: {
                    readonly type: "boolean";
                };
                readonly errors: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly warnings: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly mediaType: {
                    readonly type: "string";
                };
            };
        };
    };
};
export declare const texWorkspaceToolObservationContract: any;
export type TexWorkspaceToolObservation = FromJsonSchema<typeof texWorkspaceToolObservationSchema>;
