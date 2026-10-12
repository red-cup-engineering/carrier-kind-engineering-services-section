
export declare const blueprintClaimGraphSchema: {
    readonly $id: "metroplat/blueprint/claim-graph";
    readonly title: "BlueprintClaimGraph";
    readonly description: "A Blueprint claim-occurrence incidence graph projected from admitted Blueprint TeX plates.";
    readonly type: "object";
    readonly required: readonly ["kind", "sources", "nodes", "edges", "settled", "frontier", "unstated", "missingDependencies"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.blueprint.claim-graph";
        };
        readonly sources: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly nodes: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["id", "source", "statementKind", "leanDeclarations", "status", "line"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly source: {
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
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                    readonly part: {
                        readonly type: "string";
                    };
                    readonly chapter: {
                        readonly type: "string";
                    };
                    readonly chapterLabel: {
                        readonly type: "string";
                    };
                    readonly section: {
                        readonly type: "string";
                    };
                    readonly subsection: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly edges: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["from", "to", "relationship", "source", "line"];
                readonly additionalProperties: false;
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type BlueprintClaimGraph = FromJsonSchema<typeof blueprintClaimGraphSchema>;
export declare const blueprintClaimGraphContract: any;
export declare const blueprintClaimGraphFindingSchema: {
    readonly $id: "metroplat/blueprint/claim-graph-finding";
    readonly title: "BlueprintClaimGraphFinding";
    readonly description: "A lint finding raised over a Blueprint claim-occurrence incidence graph, or over that graph welded against a Lean declaration catalog.";
    readonly type: "object";
    readonly required: readonly ["code", "severity", "message"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly code: {
            readonly enum: readonly ["duplicate-label", "missing-upstream", "rootless-node", "unglued-node", "overboxed-definition", "label-kind-mismatch", "green-without-lean", "missing-status", "unmatched-lean-reference", "green-admitted", "red-settled"];
        };
        readonly severity: {
            readonly enum: readonly ["error", "warning"];
        };
        readonly nodeId: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly message: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly source: {
            readonly type: "string";
        };
        readonly line: {
            readonly type: "integer";
            readonly minimum: 1;
        };
    };
};
export type BlueprintClaimGraphFinding = FromJsonSchema<typeof blueprintClaimGraphFindingSchema>;
export declare const blueprintClaimGraphFindingContract: any;
