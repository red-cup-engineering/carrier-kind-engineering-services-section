import { leanToolchainContract, } from "../schema.mjs";
export { leanToolchainContract, leanToolchainSchema, } from "../schema.mjs";
export function decodeLeanToolchain(text) {
    const toolchain = text.trim();
    const version = /lean4:v?([^/\s]+)$/u.exec(toolchain)?.[1];
    const channel = /^([^:]+):/u.exec(toolchain)?.[1];
    return leanToolchainContract.assert({
        kind: "metroplat.lean.toolchain",
        toolchain,
        ...(version === undefined ? {} : { version }),
        ...(channel === undefined ? {} : { channel }),
        mediaType: "text/vnd.lean-toolchain",
    }, "Lean toolchain");
}
