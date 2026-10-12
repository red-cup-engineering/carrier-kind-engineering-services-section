export type TexWorkspaceToolKind = "tex-engine" | "blueprint-tool" | "verso-tool";
export declare const texWorkspaceIgnoredDirectories: any;
export declare const texWorkspaceDefaultTexRoots: any;
export declare const texWorkspaceDefaultBlueprintRoots: any;
export declare const texWorkspaceDefaultVersoRoots: any;
export declare function texWorkspaceShouldSkipDirectory(name: string, ignore?: ReadonlySet<string>): boolean;
