import { type LeanModule } from "../schema.mjs";
export { leanDeclarationContract, leanDeclarationSchema, leanModuleContract, leanModuleSchema, type LeanDeclaration, type LeanModule, } from "../schema.mjs";
export type LeanSourceText = Readonly<{
    module: string;
    text: string;
    path?: string;
}>;
export declare function decodeLeanModule(text: string, module: string, path?: string): LeanModule;
