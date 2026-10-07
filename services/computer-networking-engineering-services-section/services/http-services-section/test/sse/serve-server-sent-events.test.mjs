import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { sse } from "../../src/sse/serve-server-sent-events.mjs";
test("opens and writes an SSE response", ()=>{
    const req = {
        socket: {
            setTimeout () {},
            setNoDelay () {}
        }
    };
    const res = Object.assign(new EventEmitter(), {
        headers: null,
        writes: [],
        ended: false,
        writeHead (_status, headers) {
            this.headers = headers;
        },
        flushHeaders () {},
        write (chunk) {
            this.writes.push(chunk);
        },
        end () {
            this.ended = true;
        }
    });
    const writer = sse(req, res);
    writer.send("message", {
        ok: true
    });
    writer.close();
    assert.equal(res.headers["content-type"], "text/event-stream");
    assert.match(res.writes[0], /event: message/);
    assert.equal(res.ended, true);
});
