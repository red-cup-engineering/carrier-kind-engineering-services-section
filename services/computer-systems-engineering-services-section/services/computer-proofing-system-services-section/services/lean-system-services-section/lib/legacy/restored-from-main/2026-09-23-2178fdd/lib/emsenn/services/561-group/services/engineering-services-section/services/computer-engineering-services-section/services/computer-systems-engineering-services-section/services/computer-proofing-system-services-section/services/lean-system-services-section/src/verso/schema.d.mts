
export declare const versoExpositionWeldReportSchema: {
    readonly $id: "metroplat/verso/exposition-weld-report";
    readonly title: "VersoExpositionWeldReport";
    readonly description: "A Verso exposition weld report over admitted Verso plates, optional Blueprint claim graph material, and optional Lean declaration catalog material.";
    readonly type: "object";
    readonly required: readonly ["kind", "sources", "imports", "includes", "leanDeclarations", "claimOccurrences", "blueprintNodes", "checkedLeanBlocks", "leanCatalogChecked", "blueprintGraphChecked", "missingLeanDeclarations", "missingBlueprintNodes", "ok", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.verso.exposition-weld-report";
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
        readonly leanCatalogChecked: {
            readonly type: "boolean";
        };
        readonly blueprintGraphChecked: {
            readonly type: "boolean";
        };
        readonly missingLeanDeclarations: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly missingBlueprintNodes: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly ok: {
            readonly type: "boolean";
        };
        readonly evidence: {
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
export type VersoExpositionWeldReport = FromJsonSchema<typeof versoExpositionWeldReportSchema>;
export declare const versoExpositionWeldReportContract: any;
