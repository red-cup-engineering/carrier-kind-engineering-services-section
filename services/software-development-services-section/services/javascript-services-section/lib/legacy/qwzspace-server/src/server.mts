/**
 * Composing the engine onto the realtime transport.
 *
 * QwzSpace the engine is the scene kernel (space + existence + time). QwzSpace
 * the network is web-qwzspace — the geometry-agnostic single-writer tick /
 * interest-filtered snapshot / SSE+WebSocket transport. This module mounts the
 * one on the other: it hands the scene's `runTick`/`subjectsOf`/`snapOf` to
 * `createQwzspaceServer` and returns the `App` plus a handle on the live scene.
 *
 * It is engine glue, not a service: it builds an `App` for a developer to mount
 * in *their* server. It opens no socket and binds no port.
 */

import { createQwzspaceServer, type QwzspaceServer } from "@red-cup-engineering/organizing-with-the-web/qwzspace";
import type { App } from "@red-cup-engineering/http-server";
import { Scene, validateIntent, type SceneOptions } from "./scene.mjs";
import type { Intent, SceneEntry } from "./protocol.mjs";

export interface QwzspaceSceneOptions extends SceneOptions {
  /** Tick period in ms. Default 66 (~15 Hz, aletheon's rate). */
  readonly intervalMs?: number;
  readonly heartbeatMs?: number;
  /** SSE event-stream path. Default `/qwz/events`. */
  readonly eventsPath?: string;
  /** Intent POST path. Default `/qwz/act`. */
  readonly actPath?: string;
  /** Health path, or false to disable. Default `/qwz/health`. */
  readonly healthPath?: string | false;
  /** "sse" | "ws" | "both". Default "both". */
  readonly transport?: "sse" | "ws" | "both";
  /** Start the tick driver immediately. Default false — the developer drives
   *  `step()` or calls `start()`. */
  readonly autoStart?: boolean;
}

export interface QwzspaceScene {
  /** The web-server App to mount in the developer's server. */
  readonly app: App;
  /** The live scene — spawn bodies, inspect existence, read causal time. */
  readonly scene: Scene;
  /** The underlying transport server (queue, snapshot manager, hub, replay). */
  readonly server: QwzspaceServer<Intent, SceneEntry>;
  /** Advance one tick manually (drains queued intents). */
  step(): Promise<unknown>;
  /** Begin the interval tick driver. */
  start(): Promise<unknown>;
  /** Current tick. */
  tickNow(): number;
  /** First full frame resolves when the scene has bootstrapped. */
  readonly ready: Promise<unknown>;
}

/**
 * Build the engine's `App`, wiring the scene kernel into web-qwzspace. The
 * developer mounts `app` in their server and spawns bodies through `scene`.
 */
export const createQwzspaceScene = (options: QwzspaceSceneOptions = {}): QwzspaceScene => {
  const scene = new Scene(options);
  const server = createQwzspaceServer<Intent, SceneEntry>({
    transport: options.transport ?? "both",
    eventsPath: options.eventsPath ?? "/qwz/events",
    actPath: options.actPath ?? "/qwz/act",
    healthPath: options.healthPath ?? "/qwz/health",
    validate: validateIntent,
    runTick: (tick, intents) => scene.runTick(tick, intents),
    subjectsOf: () => scene.subjectsOf(),
    snapOf: (subject) => scene.snapOf(subject),
    ...(options.intervalMs === undefined ? {} : { intervalMs: options.intervalMs }),
    ...(options.heartbeatMs === undefined ? {} : { heartbeatMs: options.heartbeatMs }),
    ...(options.autoStart === undefined ? {} : { autoStart: options.autoStart }),
  });
  return Object.freeze({
    app: server.app,
    scene,
    server,
    step: () => server.step(),
    start: () => server.start(),
    tickNow: () => server.tickNow(),
    ready: server.ready,
  });
};
