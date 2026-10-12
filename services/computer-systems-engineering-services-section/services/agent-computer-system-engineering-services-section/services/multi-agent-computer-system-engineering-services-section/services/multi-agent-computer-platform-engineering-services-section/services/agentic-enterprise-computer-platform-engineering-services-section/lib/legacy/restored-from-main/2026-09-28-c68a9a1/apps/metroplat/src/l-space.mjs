/**
 * L-Space tiles with the metroplex. L-Space is the Lenticule Science garden, served by its own
 * process; where this platform is told its MCP endpoint and the gateway credential it presents
 * (METROPLAT_LSPACE_MCP_URL, METROPLAT_LSPACE_GATEWAY_TOKEN), the garden's reading tools (search,
 * fetch, and the vault's read-only readings) are operations of this catalog, and reading the
 * garden is a liberty everyone in the metroplex holds. Writing the garden stays with its authors,
 * at the garden itself.
 */
import { mcpToolOperations } from "@red-cup-engineering/computer-system-engine/rpc/mcp-operations";
import { searchAndFetchTools, vaultMcpTools } from "@red-cup-engineering/knowledge-system-server/mcp-tools";

const PREFIX = "lspace";

/** The garden's reading tools, as the garden itself declares them. */
const READING_TOOLS = Object.freeze([...searchAndFetchTools(), ...vaultMcpTools].filter((tool) => tool.annotations?.readOnlyHint === true));

/** The verbs reading the garden takes in this catalog. */
export const L_SPACE_VERBS = Object.freeze(READING_TOOLS.map((tool) => `${PREFIX}-${tool.name.replace(/_/gu, "-")}`));

/** Where the garden is and the credential it knows this platform by, if the tiling is configured. */
export function lSpaceTiling(environment = process.env) {
  const url = environment.METROPLAT_LSPACE_MCP_URL?.trim(), token = environment.METROPLAT_LSPACE_GATEWAY_TOKEN?.trim();
  return url && token ? Object.freeze({ url, token }) : undefined;
}

/** The garden's reading operations, when the tiling is configured; none otherwise. */
export function lSpaceOperations(environment = process.env) {
  const tiling = lSpaceTiling(environment);
  if (tiling === undefined) return Object.freeze([]);
  return mcpToolOperations({ prefix: PREFIX, url: tiling.url, headers: () => ({ authorization: `Bearer ${tiling.token}` }), tools: READING_TOOLS });
}
