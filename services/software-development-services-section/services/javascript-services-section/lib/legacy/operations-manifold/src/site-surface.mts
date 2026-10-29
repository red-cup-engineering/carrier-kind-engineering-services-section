export type OperationsManifoldWebuxPage = Readonly<{
  path: string;
  title: string;
  kind: "primary" | "object" | "json";
  source: string;
}>;

export const OPERATIONS_MANIFOLD_WEBUX_PAGES: readonly OperationsManifoldWebuxPage[] = Object.freeze([
  page("/", "Operation Surface", "primary", "createJSNodeWebServerApp"),
  page("/topology", "Work Topology", "primary", "createWorkTopologyWebApp"),
  page("/jsnode-topology", "JSNode Topology", "primary", "createJsnodeTopologyWebApp"),
  page("/jsnode-topology/object", "JSNode Topology Object", "object", "createJsnodeTopologyWebApp"),
  page("/work-interface", "Work Interface Selection", "primary", "createWorkInterfaceWebApp"),
  page("/codebase-profile", "Codebase Profile", "primary", "createCodebaseProfileWebApp"),
  page("/codebase-profile/object", "Codebase Carrier Object", "object", "createCodebaseProfileWebApp"),
  page("/codex-harness-profile", "Codex Harness Profile", "primary", "createCodexHarnessProfileWebApp"),
  page("/endeavor-enactment-profile", "Endeavor Enactment Profile", "primary", "createEndeavorEnactmentProfileWebApp"),
  page("/endeavor-enactment-profile/object", "Endeavor Carrier Object", "object", "createEndeavorEnactmentProfileWebApp"),
  page("/messages", "Messages", "primary", "createChannelMessagesWebApp"),
  page("/messages/channel", "Message Channel", "object", "createChannelMessagesWebApp"),
  page("/message-learning", "Message Learning", "primary", "createMessageLearningWebApp"),
]);

export function operationsManifoldWebuxPagePaths(kind?: OperationsManifoldWebuxPage["kind"]): readonly string[] {
  return Object.freeze(OPERATIONS_MANIFOLD_WEBUX_PAGES
    .filter((page) => kind === undefined || page.kind === kind)
    .map((page) => page.path));
}

function page(path: string, title: string, kind: OperationsManifoldWebuxPage["kind"], source: string): OperationsManifoldWebuxPage {
  return Object.freeze({ path, title, kind, source });
}
