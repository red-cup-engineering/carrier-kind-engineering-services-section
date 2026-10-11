import { sseCommentFrame, sseFrame, sseHeaders } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";
export function sse(req, res, onClose) {
    res.writeHead(200, sseHeaders());
    res.flushHeaders?.();
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    res.on("close", ()=>onClose?.());
    return {
        send (event, data, id) {
            res.write(sseFrame(event, data, id));
        },
        comment (text) {
            res.write(sseCommentFrame(text));
        },
        close () {
            res.end();
        }
    };
}
