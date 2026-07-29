import path from "node:path";

import {
  mergeApps,
  mountAt,
  type App,
} from "@emsenn/http-server";
import { createJsnodeIckPackageBinWebApp } from "@emsenn/jsnode-ick/package-bin-web";
import { serveJsnodeIckPackageBinTransportProcesses } from "@emsenn/jsnode-ick/package-bin-transport";
import { createJsnodeTopologyWebApp, createWorkspaceDagWebApp } from "@emsenn/jsnode-ick/topology";
import { createHarnessServerApp } from "@emsenn/llm-openai-codex-harness/service";
import { EAVT_JSONL } from "@emsenn/relating/writing";

import { createCodebaseProfileWebApp } from "./operating/deriving/codebase-profile/projecting-codebase-profile-web.mts";
import { createCodexHarnessProfileWebApp } from "./operating/deriving/codex-harness-profile/projecting-codex-harness-profile-web.mts";
import { createEndeavorEnactmentProfileWebApp } from "./operating/deriving/endeavor-enactment-profile/projecting-endeavor-enactment-profile-web.mts";
import { createMessageLearningWebApp } from "./operating/learning/messages/projecting-message-learning-web.mts";
import { createChannelMessagesWebApp } from "./operating/messaging/channels/projecting-channel-messages-web.mts";
import { createWorkTopologyWebApp } from "./operating/planning/topologizing/future-work/projecting-work-topology-web.mts";
import { createWorkInterfaceWebApp } from "./operating/planning/work-interface/projecting-work-interface-web.mts";
import { operationsManifoldPackageDir } from "./package-surface.mts";

function ecosystemTransport(repoRoot: string): App {
  const readScript = path.join(repoRoot, "lib", "organizing-with-jsnode", "scripts", "read.mjs");
  return mountAt("/ecosystem", serveJsnodeIckPackageBinTransportProcesses({
    title: "organizing-with-jsnode over this JSNode ecosystem",
    protocol: "stdio-eavt",
    input: EAVT_JSONL,
    output: EAVT_JSONL,
    basePath: "/ecosystem",
    scripts: [
      {
        name: "ecosystem",
        executable: readScript,
        target: readScript,
        term: "operations-manifold.organizing-with-jsnode.ecosystem",
        facts: [
          {
            subject: "ops.561.group",
            predicate: "operations-manifold.serves",
            object: "organizing-with-jsnode over this JSNode ecosystem",
          },
        ],
      },
    ],
  }));
}

function operationsManifoldOperationSurface(repoRoot: string): App {
  return createJsnodeIckPackageBinWebApp({
    packageDir: operationsManifoldPackageDir(repoRoot),
    basePath: "/",
    webPath: "/",
    title: "561 Group Operations Manifold operation surface",
    description: "561 Group Operations Manifold package scripts projected through the JSNode ICK package-bin catalog.",
    mcp: {
      path: "/mcp",
      serverInfo: { name: "operations-manifold", version: "0.1.0" },
      instructions: "Run 561 Group Operations Manifold package scripts over the package-bin stdin/stdout transport. Supply operation parameters as JSON, EAVT JSONL, key=value rows, or a raw stdin document.",
    },
  });
}

export function createOperationsManifoldApp(repoRoot: string): App {
  const root = path.resolve(repoRoot);
  return mergeApps(
    ecosystemTransport(root),
    mountAt("/codex", createHarnessServerApp()),
    createCodebaseProfileWebApp(root),
    createCodexHarnessProfileWebApp(root),
    createEndeavorEnactmentProfileWebApp(root),
    createChannelMessagesWebApp(root),
    createMessageLearningWebApp(root),
    createJsnodeTopologyWebApp(root),
    createWorkspaceDagWebApp(root),
    createWorkTopologyWebApp(root),
    createWorkInterfaceWebApp(root),
    operationsManifoldOperationSurface(root),
  );
}
