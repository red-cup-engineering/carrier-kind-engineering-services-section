import path from "node:path";

import { extractDocSurface, type DocSymbol } from "./documentation.mjs";
import { sourceModuleFiles, type SourceModuleFileOptions } from "./source.mjs";

export interface PackageDocSymbol extends DocSymbol {
  readonly file: string;
  readonly module: string;
}

export interface PackageDocSymbolOptions extends SourceModuleFileOptions {
  readonly srcDir?: string;
}

export function packageSourceRoot(pkgDir: string, options: PackageDocSymbolOptions = {}): string {
  return path.join(pkgDir, options.srcDir ?? "src");
}

export function moduleSubpathOf(sourceRoot: string, file: string): string {
  const rel = path.relative(sourceRoot, path.dirname(file)).split(path.sep).join("/");
  return rel === "" ? "." : rel;
}

export function readPackageDocSymbols(
  pkgDir: string,
  options: PackageDocSymbolOptions = {},
): readonly PackageDocSymbol[] {
  const sourceRoot = packageSourceRoot(pkgDir, options);
  const files = sourceModuleFiles(sourceRoot, options).filter((file) => file.endsWith(".mts"));
  const symbols: PackageDocSymbol[] = [];
  for (const file of files) {
    const module = moduleSubpathOf(sourceRoot, file);
    for (const symbol of extractDocSurface(file)) {
      symbols.push(Object.freeze({ ...symbol, file, module }));
    }
  }
  return Object.freeze(symbols);
}
