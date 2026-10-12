export declare const LeanGoldenVectorSchema: {
    readonly $id: "metroplat/conformance/golden-vector";
    readonly title: "LeanGoldenVector";
    readonly description: "A Lean-emitted EAVT conformance row for a finite relational surface.";
    readonly type: "object";
    readonly required: readonly ["$schema", "e", "a", "v", "t"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly $schema: {
            readonly const: "metroplat/conformance/golden-vector";
        };
        readonly e: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly a: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly v: {};
        readonly t: {
            readonly type: "string";
            readonly minLength: 1;
        };
    };
};
export declare const leanGoldenVectorContract: any;
