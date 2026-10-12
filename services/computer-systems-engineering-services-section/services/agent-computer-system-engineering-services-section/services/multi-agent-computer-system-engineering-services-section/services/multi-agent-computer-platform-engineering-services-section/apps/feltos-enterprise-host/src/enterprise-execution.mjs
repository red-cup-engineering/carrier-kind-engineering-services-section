import { Worker } from "node:worker_threads";
import { randomUUID } from "node:crypto";
import { boundedWorkerMessage, receivedWorkerError, REPLICATION_PORTS, RESIDENT_OPERATIONS, workerError } from "./enterprise-worker-message.mjs";

/** Run only the already-authorized resident execution body off the public request event loop. */
export class EnterpriseExecutionWorker {
  #hostPath;
  #environment;
  #worker;
  #pending = new Map();
  #ready;
  #settleReady;
  #rejectReady;
  #closed = false;
  #workerUrl;
  #openWork;
  #replication;

  constructor({ hostPath, environment, openWork, replication, workerUrl = new URL("./enterprise-execution-worker.mjs", import.meta.url) }) {
    this.#hostPath = hostPath;
    this.#environment = { ...environment };
    this.#openWork = openWork;
    this.#replication = replication;
    this.#workerUrl = workerUrl;
  }

  #ensureStarted() {
    if (this.#worker !== undefined) return;
    if (this.#closed) throw new Error("enterprise execution worker is closed");
    this.#ready = new Promise((resolve, reject) => { this.#settleReady = resolve; this.#rejectReady = reject; });
    const worker = new Worker(this.#workerUrl, {
      workerData: { hostPath: this.#hostPath, environment: this.#environment },
      env: this.#environment,
    });
    this.#worker = worker;
    worker.on("message", (message) => this.#message(message, worker));
    worker.on("error", (error) => this.#fail(error, worker));
    worker.on("exit", (code) => {
      if (code !== 0) this.#fail(new Error(`enterprise execution worker exited with code ${code}`), worker);
      else this.#fail(new Error("enterprise execution worker stopped"), worker);
    });
  }

  #message(message, worker) {
    if (worker !== this.#worker) return;
    try { boundedWorkerMessage(message); }
    catch (error) { this.#fail(error, worker); void worker.terminate(); return; }
    if (message?.kind === "ready") return this.#settleReady();
    if (message?.kind === "startup-error") {
      this.#fail(new Error(`enterprise execution worker startup: ${message.error?.message ?? "unknown error"}`), worker);
      void worker?.terminate();
      return;
    }
    if (message?.kind === "open-work") {
      const active = this.#pending.get(message.executionId);
      const reply = (value) => {
        if (worker !== this.#worker || this.#closed) return;
        try { worker.postMessage(boundedWorkerMessage({ kind: "open-work-result", id: message.id, ...value })); }
        catch { /* The executing worker may have failed while the host effect was pending. */ }
      };
      if (active?.operation !== "enterprise-loop-run" || this.#openWork === undefined) {
        reply({ ok: false, error: { name: "TypeError", message: "the active enterprise operation has no host opening capability" } });
        return;
      }
      Promise.resolve().then(() => this.#openWork(message.opening)).then(
        (value) => reply({ ok: true, value }),
        (error) => reply({ ok: false, error: workerError(error) }),
      );
      return;
    }
    if (message?.kind === "replication-port") {
      const active = this.#pending.get(message.executionId);
      const port = this.#replication?.[message.port];
      const reply = (value) => {
        if (worker !== this.#worker || this.#closed) return;
        try { worker.postMessage(boundedWorkerMessage({ kind: "replication-port-result", id: message.id, ...value })); }
        catch (error) { worker.postMessage({ kind: "replication-port-result", id: message.id, ok: false, error: workerError(error) }); }
      };
      if (active?.operation !== "work-peer-catch-up" || !REPLICATION_PORTS.includes(message.port) || typeof port !== "function") {
        reply({ ok: false, error: workerError(new TypeError("active invocation has no native replication port")) });
        return;
      }
      Promise.resolve().then(() => port(message.input)).then(
        value => reply({ ok: true, value }), error => reply({ ok: false, error: workerError(error) }),
      );
      return;
    }
    const pending = this.#pending.get(message?.id);
    if (pending === undefined) return;
    this.#pending.delete(message.id);
    if (message.kind === "error") {
      pending.reject(receivedWorkerError(message.error));
    } else if (message.kind === "result") pending.resolve(message.value);
  }

  #fail(error, worker) {
    if (worker !== undefined && worker !== this.#worker) return;
    this.#rejectReady?.(error);
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
    this.#worker = undefined;
    this.#ready = undefined;
    this.#settleReady = undefined;
    this.#rejectReady = undefined;
  }

  async execute({ operation, input, arguments: arguments_, context }) {
    if (!RESIDENT_OPERATIONS.includes(operation)) {
      throw new TypeError(`unsupported isolated enterprise operation ${String(operation)}`);
    }
    this.#ensureStarted();
    await this.#ready;
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject, operation });
      try {
        this.#worker.postMessage(boundedWorkerMessage({
          kind: "execute", id, operation, input, arguments: arguments_,
          context: { invocation: context.invocation, decision: context.decision, startedAt: context.startedAt, evidence: context.evidence },
        }));
      } catch (error) {
        this.#pending.delete(id);
        reject(error);
      }
    });
  }

  /**
   * Link the execution worker's own module graph without opening a surface or running a turn: a
   * throwaway worker thread imports the worker module in link-only mode, so a link error that the
   * lazily started live worker would hit at its first turn is reported now (a boot probe's use).
   */
  link() {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.#workerUrl, { workerData: { linkOnly: true, hostPath: this.#hostPath, environment: this.#environment }, env: this.#environment });
      worker.once("message", (message) => {
        if (message?.kind === "linked") resolve();
        else reject(new Error(message?.error?.message ?? "enterprise execution worker did not link"));
        void worker.terminate();
      });
      worker.once("error", reject);
      worker.once("exit", (code) => reject(new Error(`enterprise execution worker exited with code ${code} before linking`)));
    });
  }

  async close() {
    this.#closed = true;
    if (this.#worker !== undefined) await this.#worker.terminate();
  }
}
