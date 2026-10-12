# Model Context Protocol services section

Owns transport-neutral services that implement the Model Context Protocol
message and interface contract between agents, programs, tools, and computer
resources.

HTTP transport and server policy remain under Web Server Services. In
particular, `serve-model-context-protocol-over-http-service` composes the
atomic coding service owned here rather than making MCP a kind of web server
or agent computer system.

## Services

- `services/code-model-context-protocol-service` — forms MCP initialization,
  reachability, tool-list, tool-result, and JSON-RPC values.
