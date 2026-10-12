// mesh/content.ts — Content-addressed store (CID via SHA-256).
//
// Each object is stored as a Meme: {subject: cid, predicate: "content", object: cid}.
// The CID is a hex-encoded SHA-256 digest (base16, no multicodec prefix — simple and dependency-free).
// Stored charge evidence determines whether content at a CID is locally available.
import * as crypto from "node:crypto";
import { cellValues, chargeOfUtterances, witness, UtteranceLog, recallWhere } from "@red-cup-engineering/computer-data-engine/utterance-log";
export function cidOf(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}
export class ContentStore {
    store = new UtteranceLog();
    objects = new Map();
    put(data) {
        const cid = cidOf(data);
        this.objects.set(cid, data);
        witness(this.store, { subject: cid, predicate: "content", object: cid }, [true, false]);
        return cid;
    }
    get(cid) {
        const memes = recallWhere(this.store, { subject: cid, predicate: "content" });
        if (!memes.length)
            return null;
        const g = chargeOfUtterances(memes);
        if (g !== "potential")
            return null;
        return this.objects.get(cid) ?? null;
    }
    has(cid) {
        return this.get(cid) !== null;
    }
    delete(cid) {
        this.objects.delete(cid);
        witness(this.store, { subject: cid, predicate: "content", object: cid }, [false, true]);
    }
    /** All known CIDs (including deleted — MPU settles availability). */
    cids() {
        const seen = new Set();
        for (const carrier of this.store.utterances)
            seen.add(String(cellValues(carrier).subject));
        return [...seen];
    }
    /** CIDs available locally (MPU-settled to potential). */
    available() {
        return this.cids().filter((cid) => this.has(cid));
    }
}
export function contentStore() {
    return new ContentStore();
}
/** Build content-store REST endpoints. */
export function contentStoreResource(store, prefix = "/content") {
    return [
        {
            match: `${prefix}/:cid`,
            methods: ["GET", "HEAD"],
            handler: (ctx) => {
                const cid = ctx.params["cid"] ?? "";
                const data = store.get(cid);
                if (!data) {
                    ctx.res.writeHead(404).end("Not Found");
                    return Promise.resolve();
                }
                ctx.res.setHeader("Content-Type", "application/octet-stream");
                ctx.res.setHeader("Content-Length", data.length);
                ctx.res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                if (ctx.req.method === "HEAD") {
                    ctx.res.writeHead(200).end();
                    return Promise.resolve();
                }
                ctx.res.writeHead(200).end(data);
                return Promise.resolve();
            },
        },
        {
            match: prefix,
            methods: ["POST"],
            handler: async (ctx) => {
                const chunks = [];
                await new Promise((res, rej) => {
                    ctx.req.on("data", (c) => chunks.push(c));
                    ctx.req.on("end", () => res());
                    ctx.req.on("error", rej);
                });
                const data = Buffer.concat(chunks);
                const cid = store.put(data);
                ctx.res.setHeader("Content-Type", "application/json");
                ctx.res.writeHead(201).end(JSON.stringify({ cid }));
            },
        },
    ];
}
