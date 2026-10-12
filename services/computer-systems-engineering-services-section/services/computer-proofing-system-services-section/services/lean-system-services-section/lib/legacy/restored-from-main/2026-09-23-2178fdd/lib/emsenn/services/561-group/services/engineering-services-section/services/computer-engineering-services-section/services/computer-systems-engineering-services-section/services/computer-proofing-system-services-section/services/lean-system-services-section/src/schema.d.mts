
export declare const leanToolchainSchema: {
    readonly $id: "metroplat/lean/toolchain";
    readonly title: "LeanToolchain";
    readonly description: "A Lean toolchain declaration admitted as package material.";
    readonly type: "object";
    readonly required: readonly ["kind", "toolchain"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.toolchain";
        };
        readonly toolchain: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly version: {
            readonly type: "string";
        };
        readonly channel: {
            readonly type: "string";
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanToolchain = FromJsonSchema<typeof leanToolchainSchema>;
export declare const leanToolchainContract: any;
export declare const leanLakefileSchema: {
    readonly $id: "metroplat/lean/lakefile";
    readonly title: "LeanLakefile";
    readonly description: "A Lake package declaration read as Lean project information.";
    readonly type: "object";
    readonly required: readonly ["kind", "name", "defaultTargets", "requires", "libraries"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.lakefile";
        };
        readonly name: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly version: {
            readonly type: "string";
        };
        readonly defaultTargets: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly requires: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["name"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly source: {
                        readonly type: "string";
                    };
                    readonly scope: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly libraries: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["name"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly roots: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                    readonly sourceDir: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanLakefile = FromJsonSchema<typeof leanLakefileSchema>;
export declare const leanLakefileContract: any;
export declare const leanDeclarationSchema: {
    readonly $id: "metroplat/lean/declaration";
    readonly title: "LeanDeclaration";
    readonly description: "A declared Lean name and its proof-status reading from source text.";
    readonly type: "object";
    readonly required: readonly ["kind", "name"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly enum: readonly ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"];
        };
        readonly name: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly namespace: {
            readonly type: "string";
        };
        readonly line: {
            readonly type: "integer";
            readonly minimum: 1;
        };
        readonly proofStatus: {
            readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
        };
    };
};
export type LeanDeclaration = FromJsonSchema<typeof leanDeclarationSchema>;
export declare const leanDeclarationContract: any;
export declare const leanModuleSchema: {
    readonly $id: "metroplat/lean/module";
    readonly title: "LeanModule";
    readonly description: "A Lean module read as imports plus declarations.";
    readonly type: "object";
    readonly required: readonly ["kind", "id", "imports", "declarations"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.module";
        };
        readonly id: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly path: {
            readonly type: "string";
        };
        readonly imports: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly declarations: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/lean/declaration";
                readonly title: "LeanDeclaration";
                readonly description: "A declared Lean name and its proof-status reading from source text.";
                readonly type: "object";
                readonly required: readonly ["kind", "name"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly enum: readonly ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"];
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly namespace: {
                        readonly type: "string";
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                    readonly proofStatus: {
                        readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                    };
                };
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanModule = FromJsonSchema<typeof leanModuleSchema>;
export declare const leanModuleContract: any;
export declare const leanDeclarationIndexSchema: {
    readonly $id: "metroplat/lean/declaration-index";
    readonly title: "LeanDeclarationIndex";
    readonly description: "A declared obligation index for Lean names that should be present in an environment.";
    readonly type: "object";
    readonly required: readonly ["kind", "source", "declarations"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.declaration-index";
        };
        readonly source: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly declarations: {
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
export type LeanDeclarationIndex = FromJsonSchema<typeof leanDeclarationIndexSchema>;
export declare const leanDeclarationIndexContract: any;
export declare const leanEnvironmentSchema: {
    readonly $id: "metroplat/lean/environment";
    readonly title: "LeanEnvironment";
    readonly description: "A Lean project environment as admitted toolchain, Lake metadata, modules, and declared obligations.";
    readonly type: "object";
    readonly required: readonly ["kind", "rootModule", "modules"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.environment";
        };
        readonly rootModule: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly toolchain: {
            readonly $id: "metroplat/lean/toolchain";
            readonly title: "LeanToolchain";
            readonly description: "A Lean toolchain declaration admitted as package material.";
            readonly type: "object";
            readonly required: readonly ["kind", "toolchain"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.toolchain";
                };
                readonly toolchain: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly version: {
                    readonly type: "string";
                };
                readonly channel: {
                    readonly type: "string";
                };
                readonly mediaType: {
                    readonly type: "string";
                };
            };
        };
        readonly lakefile: {
            readonly $id: "metroplat/lean/lakefile";
            readonly title: "LeanLakefile";
            readonly description: "A Lake package declaration read as Lean project information.";
            readonly type: "object";
            readonly required: readonly ["kind", "name", "defaultTargets", "requires", "libraries"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.lakefile";
                };
                readonly name: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly version: {
                    readonly type: "string";
                };
                readonly defaultTargets: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly requires: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["name"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly source: {
                                readonly type: "string";
                            };
                            readonly scope: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly libraries: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["name"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly roots: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                            };
                            readonly sourceDir: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly mediaType: {
                    readonly type: "string";
                };
            };
        };
        readonly declarationIndex: {
            readonly $id: "metroplat/lean/declaration-index";
            readonly title: "LeanDeclarationIndex";
            readonly description: "A declared obligation index for Lean names that should be present in an environment.";
            readonly type: "object";
            readonly required: readonly ["kind", "source", "declarations"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.declaration-index";
                };
                readonly source: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly declarations: {
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
        readonly modules: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/lean/module";
                readonly title: "LeanModule";
                readonly description: "A Lean module read as imports plus declarations.";
                readonly type: "object";
                readonly required: readonly ["kind", "id", "imports", "declarations"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.lean.module";
                    };
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly path: {
                        readonly type: "string";
                    };
                    readonly imports: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                    readonly declarations: {
                        readonly type: "array";
                        readonly items: {
                            readonly $id: "metroplat/lean/declaration";
                            readonly title: "LeanDeclaration";
                            readonly description: "A declared Lean name and its proof-status reading from source text.";
                            readonly type: "object";
                            readonly required: readonly ["kind", "name"];
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly kind: {
                                    readonly enum: readonly ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"];
                                };
                                readonly name: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly namespace: {
                                    readonly type: "string";
                                };
                                readonly line: {
                                    readonly type: "integer";
                                    readonly minimum: 1;
                                };
                                readonly proofStatus: {
                                    readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanEnvironment = FromJsonSchema<typeof leanEnvironmentSchema>;
export declare const leanEnvironmentContract: any;
export declare const leanMetaprogrammingDeclarationSchema: {
    readonly $id: "metroplat/lean/metaprogramming-declaration";
    readonly title: "LeanMetaprogrammingDeclaration";
    readonly description: "A typed Lean declaration intent, renderable as Lean source and readable through the Lean module codec.";
    readonly type: "object";
    readonly required: readonly ["kind", "name", "signature", "body"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly enum: readonly ["theorem", "lemma", "def", "abbrev"];
        };
        readonly name: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly signature: {
            readonly type: "string";
        };
        readonly body: {
            readonly type: "string";
        };
        readonly attributes: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly modifiers: {
            readonly type: "array";
            readonly items: {
                readonly enum: readonly ["noncomputable", "private", "protected"];
            };
        };
    };
};
export type LeanMetaprogrammingDeclaration = FromJsonSchema<typeof leanMetaprogrammingDeclarationSchema>;
export declare const leanMetaprogrammingDeclarationContract: any;
export declare const leanMetaprogrammingModuleRequestSchema: {
    readonly $id: "metroplat/lean/metaprogramming-module-request";
    readonly title: "LeanMetaprogrammingModuleRequest";
    readonly description: "A pure Lean module-rendering request: imports, an optional namespace, and declarations to synthesize as source.";
    readonly type: "object";
    readonly required: readonly ["kind", "module", "declarations"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.metaprogramming-module-request";
        };
        readonly module: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly path: {
            readonly type: "string";
        };
        readonly imports: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly namespace: {
            readonly type: "string";
        };
        readonly declarations: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/lean/metaprogramming-declaration";
                readonly title: "LeanMetaprogrammingDeclaration";
                readonly description: "A typed Lean declaration intent, renderable as Lean source and readable through the Lean module codec.";
                readonly type: "object";
                readonly required: readonly ["kind", "name", "signature", "body"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly enum: readonly ["theorem", "lemma", "def", "abbrev"];
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly signature: {
                        readonly type: "string";
                    };
                    readonly body: {
                        readonly type: "string";
                    };
                    readonly attributes: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                    readonly modifiers: {
                        readonly type: "array";
                        readonly items: {
                            readonly enum: readonly ["noncomputable", "private", "protected"];
                        };
                    };
                };
            };
        };
    };
};
export type LeanMetaprogrammingModuleRequest = FromJsonSchema<typeof leanMetaprogrammingModuleRequestSchema>;
export declare const leanMetaprogrammingModuleRequestContract: any;
export declare const leanMetaprogrammingModuleSchema: {
    readonly $id: "metroplat/lean/metaprogramming-module";
    readonly title: "LeanMetaprogrammingModule";
    readonly description: "A rendered Lean module source plus its decoded Lean module record.";
    readonly type: "object";
    readonly required: readonly ["kind", "module", "text", "declarations", "decodedModule"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.metaprogramming-module";
        };
        readonly module: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly path: {
            readonly type: "string";
        };
        readonly text: {
            readonly type: "string";
        };
        readonly declarations: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly decodedModule: {
            readonly $id: "metroplat/lean/module";
            readonly title: "LeanModule";
            readonly description: "A Lean module read as imports plus declarations.";
            readonly type: "object";
            readonly required: readonly ["kind", "id", "imports", "declarations"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.module";
                };
                readonly id: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly path: {
                    readonly type: "string";
                };
                readonly imports: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly declarations: {
                    readonly type: "array";
                    readonly items: {
                        readonly $id: "metroplat/lean/declaration";
                        readonly title: "LeanDeclaration";
                        readonly description: "A declared Lean name and its proof-status reading from source text.";
                        readonly type: "object";
                        readonly required: readonly ["kind", "name"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly kind: {
                                readonly enum: readonly ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"];
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly namespace: {
                                readonly type: "string";
                            };
                            readonly line: {
                                readonly type: "integer";
                                readonly minimum: 1;
                            };
                            readonly proofStatus: {
                                readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                            };
                        };
                    };
                };
                readonly mediaType: {
                    readonly type: "string";
                };
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanMetaprogrammingModule = FromJsonSchema<typeof leanMetaprogrammingModuleSchema>;
export declare const leanMetaprogrammingModuleContract: any;
export declare const leanDeclarationCatalogSchema: {
    readonly $id: "metroplat/lean/declaration-catalog";
    readonly title: "LeanDeclarationCatalog";
    readonly description: "A module-indexed catalog of Lean declarations read from admitted Lean modules.";
    readonly type: "object";
    readonly required: readonly ["kind", "rootModule", "entries"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.declaration-catalog";
        };
        readonly rootModule: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly entries: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["module", "name", "kind"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly module: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly kind: {
                        readonly enum: readonly ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"];
                    };
                    readonly namespace: {
                        readonly type: "string";
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                    readonly proofStatus: {
                        readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                    };
                };
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanDeclarationCatalog = FromJsonSchema<typeof leanDeclarationCatalogSchema>;
export declare const leanDeclarationCatalogContract: any;
export declare const leanImportGraphSchema: {
    readonly $id: "metroplat/lean/import-graph";
    readonly title: "LeanImportGraph";
    readonly description: "A finite Lean import topology over project modules and imported module names.";
    readonly type: "object";
    readonly required: readonly ["kind", "nodes", "edges", "cycles", "h1"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.import-graph";
        };
        readonly nodes: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["id", "workspaceMember"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly path: {
                        readonly type: "string";
                    };
                    readonly workspaceMember: {
                        readonly type: "boolean";
                    };
                };
            };
        };
        readonly edges: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["from", "to", "relationship", "resolvedBy"];
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
                        readonly const: "import";
                    };
                    readonly resolvedBy: {
                        readonly const: "lean-import";
                    };
                };
            };
        };
        readonly cycles: {
            readonly type: "array";
            readonly items: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
            };
        };
        readonly h1: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanImportGraph = FromJsonSchema<typeof leanImportGraphSchema>;
export declare const leanImportGraphContract: any;
export declare const leanTheoremSpineSchema: {
    readonly $id: "metroplat/lean/theorem-spine";
    readonly title: "LeanTheoremSpine";
    readonly description: "A theorem/lemma spine read from admitted Lean modules.";
    readonly type: "object";
    readonly required: readonly ["kind", "rootModule", "entries", "admitted"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.theorem-spine";
        };
        readonly rootModule: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly entries: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["module", "name", "kind"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly module: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly name: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly kind: {
                        readonly enum: readonly ["theorem", "lemma"];
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                    readonly proofStatus: {
                        readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                    };
                };
            };
        };
        readonly admitted: {
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
export type LeanTheoremSpine = FromJsonSchema<typeof leanTheoremSpineSchema>;
export declare const leanTheoremSpineContract: any;
export declare const leanObligationCoverageRequestSchema: {
    readonly $id: "metroplat/lean/obligation-coverage-request";
    readonly title: "LeanObligationCoverageRequest";
    readonly description: "A theorem spine paired with declared Lean obligations for coverage reading.";
    readonly type: "object";
    readonly required: readonly ["kind", "spine", "declarationIndex"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.obligation-coverage-request";
        };
        readonly spine: {
            readonly $id: "metroplat/lean/theorem-spine";
            readonly title: "LeanTheoremSpine";
            readonly description: "A theorem/lemma spine read from admitted Lean modules.";
            readonly type: "object";
            readonly required: readonly ["kind", "rootModule", "entries", "admitted"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.theorem-spine";
                };
                readonly rootModule: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly entries: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["module", "name", "kind"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly module: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly kind: {
                                readonly enum: readonly ["theorem", "lemma"];
                            };
                            readonly line: {
                                readonly type: "integer";
                                readonly minimum: 1;
                            };
                            readonly proofStatus: {
                                readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                            };
                        };
                    };
                };
                readonly admitted: {
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
        readonly declarationIndex: {
            readonly $id: "metroplat/lean/declaration-index";
            readonly title: "LeanDeclarationIndex";
            readonly description: "A declared obligation index for Lean names that should be present in an environment.";
            readonly type: "object";
            readonly required: readonly ["kind", "source", "declarations"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.declaration-index";
                };
                readonly source: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly declarations: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanObligationCoverageRequest = FromJsonSchema<typeof leanObligationCoverageRequestSchema>;
export declare const leanObligationCoverageRequestContract: any;
export declare const leanObligationCoverageSchema: {
    readonly $id: "metroplat/lean/obligation-coverage";
    readonly title: "LeanObligationCoverage";
    readonly description: "Coverage of declared Lean obligations by an admitted theorem spine.";
    readonly type: "object";
    readonly required: readonly ["kind", "declared", "present", "missing", "extra", "admitted"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.obligation-coverage";
        };
        readonly declared: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly present: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly missing: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly extra: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly admitted: {
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
export type LeanObligationCoverage = FromJsonSchema<typeof leanObligationCoverageSchema>;
export declare const leanObligationCoverageContract: any;
export declare const leanFormalizationClaimSchema: {
    readonly $id: "metroplat/lean/formalization-claim";
    readonly title: "LeanFormalizationClaim";
    readonly description: "A claim that a named Lean theorem formalizes a certificate, action, or relational configuration.";
    readonly type: "object";
    readonly required: readonly ["kind", "theorem"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.formalization-claim";
        };
        readonly theorem: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly source: {
            readonly type: "string";
        };
        readonly theoremMaturity: {
            readonly type: "string";
        };
        readonly environmentMaturity: {
            readonly type: "string";
        };
        readonly obligations: {
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
export type LeanFormalizationClaim = FromJsonSchema<typeof leanFormalizationClaimSchema>;
export declare const leanFormalizationClaimContract: any;
export declare const leanFormalizationReportSchema: {
    readonly $id: "metroplat/lean/formalization-report";
    readonly title: "LeanFormalizationReport";
    readonly description: "A report checking a formalization claim against an admitted Lean theorem spine.";
    readonly type: "object";
    readonly required: readonly ["kind", "theorem", "present", "proved", "accepted", "missing", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.formalization-report";
        };
        readonly theorem: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly source: {
            readonly type: "string";
        };
        readonly present: {
            readonly type: "boolean";
        };
        readonly proved: {
            readonly type: "boolean";
        };
        readonly accepted: {
            readonly type: "boolean";
        };
        readonly proofStatus: {
            readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
        };
        readonly theoremMaturity: {
            readonly type: "string";
        };
        readonly environmentMaturity: {
            readonly type: "string";
        };
        readonly obligations: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly missing: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanFormalizationReport = FromJsonSchema<typeof leanFormalizationReportSchema>;
export declare const leanFormalizationReportContract: any;
export declare const leanFormalizationReportRequestSchema: {
    readonly $id: "metroplat/lean/formalization-report-request";
    readonly title: "LeanFormalizationReportRequest";
    readonly description: "A formalization claim paired with a Lean theorem spine for proof-status checking.";
    readonly type: "object";
    readonly required: readonly ["kind", "claim", "spine"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.formalization-report-request";
        };
        readonly claim: {
            readonly $id: "metroplat/lean/formalization-claim";
            readonly title: "LeanFormalizationClaim";
            readonly description: "A claim that a named Lean theorem formalizes a certificate, action, or relational configuration.";
            readonly type: "object";
            readonly required: readonly ["kind", "theorem"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.formalization-claim";
                };
                readonly theorem: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly source: {
                    readonly type: "string";
                };
                readonly theoremMaturity: {
                    readonly type: "string";
                };
                readonly environmentMaturity: {
                    readonly type: "string";
                };
                readonly obligations: {
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
        readonly spine: {
            readonly $id: "metroplat/lean/theorem-spine";
            readonly title: "LeanTheoremSpine";
            readonly description: "A theorem/lemma spine read from admitted Lean modules.";
            readonly type: "object";
            readonly required: readonly ["kind", "rootModule", "entries", "admitted"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.theorem-spine";
                };
                readonly rootModule: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly entries: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["module", "name", "kind"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly module: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly kind: {
                                readonly enum: readonly ["theorem", "lemma"];
                            };
                            readonly line: {
                                readonly type: "integer";
                                readonly minimum: 1;
                            };
                            readonly proofStatus: {
                                readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                            };
                        };
                    };
                };
                readonly admitted: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanFormalizationReportRequest = FromJsonSchema<typeof leanFormalizationReportRequestSchema>;
export declare const leanFormalizationReportRequestContract: any;
export declare const leanCapabilitySurfaceSchema: {
    readonly $id: "metroplat/lean/capability-surface";
    readonly title: "LeanCapabilitySurface";
    readonly description: "Concrete package capabilities that Lean formalization claims may govern.";
    readonly type: "object";
    readonly required: readonly ["kind", "actions", "schemas", "exports"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.capability-surface";
        };
        readonly actions: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly schemas: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly exports: {
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
export type LeanCapabilitySurface = FromJsonSchema<typeof leanCapabilitySurfaceSchema>;
export declare const leanCapabilitySurfaceContract: any;
export declare const leanCapabilityClaimSchema: {
    readonly $id: "metroplat/lean/capability-claim";
    readonly title: "LeanCapabilityClaim";
    readonly description: "A claim that a Lean theorem governs concrete package capability references.";
    readonly type: "object";
    readonly required: readonly ["kind", "theorem", "governs"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.capability-claim";
        };
        readonly theorem: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly source: {
            readonly type: "string";
        };
        readonly governs: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["kind", "id"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly enum: readonly ["action", "schema", "export"];
                    };
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanCapabilityClaim = FromJsonSchema<typeof leanCapabilityClaimSchema>;
export declare const leanCapabilityClaimContract: any;
export declare const leanCapabilityClaimIndexSchema: {
    readonly $id: "metroplat/lean/capability-claim-index";
    readonly title: "LeanCapabilityClaimIndex";
    readonly description: "Lean capability authority claims discovered in package text.";
    readonly type: "object";
    readonly required: readonly ["kind", "source", "claims"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.capability-claim-index";
        };
        readonly source: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly claims: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/lean/capability-claim";
                readonly title: "LeanCapabilityClaim";
                readonly description: "A claim that a Lean theorem governs concrete package capability references.";
                readonly type: "object";
                readonly required: readonly ["kind", "theorem", "governs"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.lean.capability-claim";
                    };
                    readonly theorem: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly source: {
                        readonly type: "string";
                    };
                    readonly governs: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly required: readonly ["kind", "id"];
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly kind: {
                                    readonly enum: readonly ["action", "schema", "export"];
                                };
                                readonly id: {
                                    readonly type: "string";
                                    readonly minLength: 1;
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanCapabilityClaimIndex = FromJsonSchema<typeof leanCapabilityClaimIndexSchema>;
export declare const leanCapabilityClaimIndexContract: any;
export declare const leanCapabilityAuthorityReportSchema: {
    readonly $id: "metroplat/lean/capability-authority-report";
    readonly title: "LeanCapabilityAuthorityReport";
    readonly description: "A report checking Lean theorem authority claims against a theorem spine and real package capability surface.";
    readonly type: "object";
    readonly required: readonly ["kind", "accepted", "claims", "missingTheorems", "unprovedTheorems", "missingCapabilities", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.capability-authority-report";
        };
        readonly accepted: {
            readonly type: "boolean";
        };
        readonly claims: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["theorem", "theoremPresent", "theoremProved", "proofStatus", "governs", "missingCapabilities"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly theorem: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly source: {
                        readonly type: "string";
                    };
                    readonly theoremPresent: {
                        readonly type: "boolean";
                    };
                    readonly theoremProved: {
                        readonly type: "boolean";
                    };
                    readonly proofStatus: {
                        readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                    };
                    readonly governs: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly required: readonly ["kind", "id"];
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly kind: {
                                    readonly enum: readonly ["action", "schema", "export"];
                                };
                                readonly id: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                            };
                        };
                    };
                    readonly missingCapabilities: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                };
            };
        };
        readonly missingTheorems: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly unprovedTheorems: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly missingCapabilities: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanCapabilityAuthorityReport = FromJsonSchema<typeof leanCapabilityAuthorityReportSchema>;
export declare const leanCapabilityAuthorityReportContract: any;
export declare const leanCapabilityAuthorityReportRequestSchema: {
    readonly $id: "metroplat/lean/capability-authority-report-request";
    readonly title: "LeanCapabilityAuthorityReportRequest";
    readonly description: "Lean capability claims paired with a theorem spine and concrete package capability surface.";
    readonly type: "object";
    readonly required: readonly ["kind", "claims", "spine", "surface"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.capability-authority-report-request";
        };
        readonly claims: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/lean/capability-claim";
                readonly title: "LeanCapabilityClaim";
                readonly description: "A claim that a Lean theorem governs concrete package capability references.";
                readonly type: "object";
                readonly required: readonly ["kind", "theorem", "governs"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.lean.capability-claim";
                    };
                    readonly theorem: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly source: {
                        readonly type: "string";
                    };
                    readonly governs: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly required: readonly ["kind", "id"];
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly kind: {
                                    readonly enum: readonly ["action", "schema", "export"];
                                };
                                readonly id: {
                                    readonly type: "string";
                                    readonly minLength: 1;
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
        readonly spine: {
            readonly $id: "metroplat/lean/theorem-spine";
            readonly title: "LeanTheoremSpine";
            readonly description: "A theorem/lemma spine read from admitted Lean modules.";
            readonly type: "object";
            readonly required: readonly ["kind", "rootModule", "entries", "admitted"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.theorem-spine";
                };
                readonly rootModule: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly entries: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["module", "name", "kind"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly module: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly kind: {
                                readonly enum: readonly ["theorem", "lemma"];
                            };
                            readonly line: {
                                readonly type: "integer";
                                readonly minimum: 1;
                            };
                            readonly proofStatus: {
                                readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                            };
                        };
                    };
                };
                readonly admitted: {
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
        readonly surface: {
            readonly $id: "metroplat/lean/capability-surface";
            readonly title: "LeanCapabilitySurface";
            readonly description: "Concrete package capabilities that Lean formalization claims may govern.";
            readonly type: "object";
            readonly required: readonly ["kind", "actions", "schemas", "exports"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.capability-surface";
                };
                readonly actions: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly schemas: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly exports: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanCapabilityAuthorityReportRequest = FromJsonSchema<typeof leanCapabilityAuthorityReportRequestSchema>;
export declare const leanCapabilityAuthorityReportRequestContract: any;
export declare const leanTheoremReferenceIndexSchema: {
    readonly $id: "metroplat/lean/theorem-reference-index";
    readonly title: "LeanTheoremReferenceIndex";
    readonly description: "Lean theorem names referenced by Node, Markdown, or other package text as formal grounding claims.";
    readonly type: "object";
    readonly required: readonly ["kind", "source", "references"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.theorem-reference-index";
        };
        readonly source: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly references: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["theorem", "source", "line"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly theorem: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly source: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                    readonly context: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanTheoremReferenceIndex = FromJsonSchema<typeof leanTheoremReferenceIndexSchema>;
export declare const leanTheoremReferenceIndexContract: any;
export declare const leanTheoremReferenceCoverageRequestSchema: {
    readonly $id: "metroplat/lean/theorem-reference-coverage-request";
    readonly title: "LeanTheoremReferenceCoverageRequest";
    readonly description: "A theorem-reference index paired with a Lean theorem spine for grounding coverage.";
    readonly type: "object";
    readonly required: readonly ["kind", "index", "spine"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.theorem-reference-coverage-request";
        };
        readonly index: {
            readonly $id: "metroplat/lean/theorem-reference-index";
            readonly title: "LeanTheoremReferenceIndex";
            readonly description: "Lean theorem names referenced by Node, Markdown, or other package text as formal grounding claims.";
            readonly type: "object";
            readonly required: readonly ["kind", "source", "references"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.theorem-reference-index";
                };
                readonly source: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly references: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["theorem", "source", "line"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly theorem: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly source: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly line: {
                                readonly type: "integer";
                                readonly minimum: 1;
                            };
                            readonly context: {
                                readonly type: "string";
                            };
                        };
                    };
                };
                readonly mediaType: {
                    readonly type: "string";
                };
            };
        };
        readonly spine: {
            readonly $id: "metroplat/lean/theorem-spine";
            readonly title: "LeanTheoremSpine";
            readonly description: "A theorem/lemma spine read from admitted Lean modules.";
            readonly type: "object";
            readonly required: readonly ["kind", "rootModule", "entries", "admitted"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly kind: {
                    readonly const: "metroplat.lean.theorem-spine";
                };
                readonly rootModule: {
                    readonly type: "string";
                    readonly minLength: 1;
                };
                readonly entries: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["module", "name", "kind"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly module: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly name: {
                                readonly type: "string";
                                readonly minLength: 1;
                            };
                            readonly kind: {
                                readonly enum: readonly ["theorem", "lemma"];
                            };
                            readonly line: {
                                readonly type: "integer";
                                readonly minimum: 1;
                            };
                            readonly proofStatus: {
                                readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
                            };
                        };
                    };
                };
                readonly admitted: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanTheoremReferenceCoverageRequest = FromJsonSchema<typeof leanTheoremReferenceCoverageRequestSchema>;
export declare const leanTheoremReferenceCoverageRequestContract: any;
export declare const leanTheoremReferenceCoverageSchema: {
    readonly $id: "metroplat/lean/theorem-reference-coverage";
    readonly title: "LeanTheoremReferenceCoverage";
    readonly description: "Coverage of referenced Lean theorem names by an admitted theorem spine.";
    readonly type: "object";
    readonly required: readonly ["kind", "referenced", "present", "proved", "missing", "unproved", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.theorem-reference-coverage";
        };
        readonly referenced: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly present: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly proved: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly missing: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly unproved: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanTheoremReferenceCoverage = FromJsonSchema<typeof leanTheoremReferenceCoverageSchema>;
export declare const leanTheoremReferenceCoverageContract: any;
export declare const leanProjectTheoremMapSchema: {
    readonly $id: "metroplat/lean/project-theorem-map";
    readonly title: "LeanProjectTheoremMap";
    readonly description: "A project-root map from Node-carried package surfaces to the upstream Obsmetrologia theorem names they cite, keeping runtime-finite receipts and open theorem frontiers explicit.";
    readonly type: "object";
    readonly required: readonly ["kind", "package", "rootModule", "links", "openFrontier", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.project-theorem-map";
        };
        readonly package: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly rootModule: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly links: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["surface", "theorem", "proofStatus", "frontier", "evidence"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly surface: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly theorem: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly proofStatus: {
                        readonly enum: readonly ["lean-proved", "runtime-finite-receipt", "documented-frontier"];
                    };
                    readonly frontier: {
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
            };
        };
        readonly openFrontier: {
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
        readonly mediaType: {
            readonly type: "string";
        };
    };
};
export type LeanProjectTheoremMap = FromJsonSchema<typeof leanProjectTheoremMapSchema>;
export declare const leanProjectTheoremMapContract: any;
export declare const leanWorkspaceModuleSourceSchema: {
    readonly $id: "metroplat/lean/workspace-module-source";
    readonly title: "LeanWorkspaceModuleSource";
    readonly description: "A Lean module source mark read from a live workspace boundary.";
    readonly type: "object";
    readonly required: readonly ["module", "path", "text"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly module: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly path: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly text: {
            readonly type: "string";
        };
    };
};
export type LeanWorkspaceModuleSource = FromJsonSchema<typeof leanWorkspaceModuleSourceSchema>;
export declare const leanWorkspaceModuleSourceContract: any;
export declare const leanWorkspaceTopicReadSchema: {
    readonly $id: "metroplat/lean/workspace-topic-read";
    readonly title: "LeanWorkspaceTopicRead";
    readonly description: "A bounded Lean workspace read around selected terms: matching Lean modules plus Blueprint and Verso projections that mention the same material.";
    readonly type: "object";
    readonly required: readonly ["kind", "root", "rootModule", "terms", "moduleSources", "modules", "references", "evidence"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.workspace-topic-read";
        };
        readonly root: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly rootModule: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly terms: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly searchTerms: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly moduleSources: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/lean/workspace-module-source";
                readonly title: "LeanWorkspaceModuleSource";
                readonly description: "A Lean module source mark read from a live workspace boundary.";
                readonly type: "object";
                readonly required: readonly ["module", "path", "text"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly module: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
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
        readonly modules: {
            readonly type: "array";
            readonly items: {
                readonly $id: "metroplat/lean/module";
                readonly title: "LeanModule";
                readonly description: "A Lean module read as imports plus declarations.";
                readonly type: "object";
                readonly required: readonly ["kind", "id", "imports", "declarations"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly kind: {
                        readonly const: "metroplat.lean.module";
                    };
                    readonly id: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly path: {
                        readonly type: "string";
                    };
                    readonly imports: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                            readonly minLength: 1;
                        };
                    };
                    readonly declarations: {
                        readonly type: "array";
                        readonly items: {
                            readonly $id: "metroplat/lean/declaration";
                            readonly title: "LeanDeclaration";
                            readonly description: "A declared Lean name and its proof-status reading from source text.";
                            readonly type: "object";
                            readonly required: readonly ["kind", "name"];
                            readonly additionalProperties: false;
                            readonly properties: {
                                readonly kind: {
                                    readonly enum: readonly ["theorem", "lemma", "def", "inductive", "structure", "class", "axiom", "opaque", "abbrev", "instance"];
                                };
                                readonly name: {
                                    readonly type: "string";
                                    readonly minLength: 1;
                                };
                                readonly namespace: {
                                    readonly type: "string";
                                };
                                readonly line: {
                                    readonly type: "integer";
                                    readonly minimum: 1;
                                };
                                readonly proofStatus: {
                                    readonly enum: readonly ["proved", "assumed", "admitted", "unknown"];
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
        readonly references: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["path", "line", "term", "snippet"];
                readonly additionalProperties: false;
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly line: {
                        readonly type: "integer";
                        readonly minimum: 1;
                    };
                    readonly term: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly snippet: {
                        readonly type: "string";
                    };
                };
            };
        };
        readonly blueprintClaimGraph: any;
        readonly versoExpositionWeldReport: any;
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
export type LeanWorkspaceTopicRead = FromJsonSchema<typeof leanWorkspaceTopicReadSchema>;
export declare const leanWorkspaceTopicReadContract: any;
export declare const leanBuildReportSchema: {
    readonly $id: "metroplat/lean/build-report";
    readonly title: "LeanBuildReport";
    readonly description: "A Lean command result read as success, errors, and warnings.";
    readonly type: "object";
    readonly required: readonly ["kind", "command", "args", "exitCode", "stdout", "stderr", "succeeded", "errors", "warnings"];
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly const: "metroplat.lean.build-report";
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
export type LeanBuildReport = FromJsonSchema<typeof leanBuildReportSchema>;
export declare const leanBuildReportContract: any;
/**
 * Bare Lean-workspace read options: what a live filesystem scan needs to
 * find and bound a Lean project. Metroplat's own service boundary composes
 * this with its Codex-session and package-capability-surface options in its
 * own request schema; this shape names only the Lean/TeX/Blueprint/Verso
 * reading concerns this package's `readLeanWorkspaceCore` uses.
 */
export declare const leanWorkspaceReadOptionsSchema: {
    readonly $id: "metroplat/lean/workspace-read-options";
    readonly title: "LeanWorkspaceReadOptions";
    readonly description: "Filesystem-bounded options for reading a Lean claim-occurrence workspace.";
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly rootModule: {
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
        readonly moduleRoots: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly declarationIndexPaths: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly referenceRoots: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly referenceExtensions: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly minLength: 1;
            };
        };
        readonly includeTexWorkspaceFibers: {
            readonly type: "boolean";
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
    };
};
export type LeanWorkspaceReadOptionsMaterial = FromJsonSchema<typeof leanWorkspaceReadOptionsSchema>;
export declare const leanWorkspaceReadOptionsContract: any;
