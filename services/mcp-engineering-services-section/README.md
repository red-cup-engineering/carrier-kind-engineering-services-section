# MCP Engineering Services Section

The house's one Model Context Protocol implementation. Every MCP server and client in the house composes these modules; none carries its own JSON-RPC framing.

- `./server`: `createMcpServer` dispatches the lifecycle (with protocol-version negotiation), tools, resources, resource templates, prompts, pagination, batches and an observation hook. Tool arguments are admitted against each tool's `inputSchema` before its handler runs, and every entry can be hidden per principal. `mcpOperationTools` turns typed operations into tools executed by the platform a request carries. The stdio transport accepts line and `Content-Length` framing.
- `./federation`: publish namespaced upstream tools through a live catalogue. Initial discovery and later refresh wait at most 1.5 seconds; unfinished peers publish independently when they answer.
- `./http`: `mcpResource` is the Streamable HTTP transport as one web-application resource. It serves the Fetch-shaped and native Node contexts and handles bearer authentication with the RFC 9728 `resource_metadata` challenge, origin checks, optional sessions, and single-event streams.
- `./client`: `createMcpClient` over `mcpHttpTransport` or `mcpStdioTransport`.
- `scripts/bridge-mcp-server.mjs`: expose one authenticated HTTP MCP node to a stdio-only client.
- `scripts/call-tool.mjs`: make one authenticated HTTP tool call with JSON on stdin and only the tool value on stdout; `--input-key` wraps carrier input and repeatable `--argument name=value` adds fixed host-supplied fields.
- `./tool-binding`: `bindMcpTools` turns an explicitly granted subset of a server's tools into function-calling tools.
- `./client-endpoint`: the JSON carrier for stdio and HTTP client configuration.
- `./catalog`: admission of external tool catalogs, and tool refusals.
- `./articulating-tools`: the articulating apex's actions as tools.

Authorization servers live in `oauth-services-section`; what a server offers lives with the system that serves it.

Compose local tools with live catalogues explicitly: `createMcpServer({ name, version, tools: localTools, toolSources: [federation.tools] })`. The same options pass through `mcpResource`. Keep the source collection itself, including when initially empty; spreading a catalogue creates a snapshot and conveys no subscription.
