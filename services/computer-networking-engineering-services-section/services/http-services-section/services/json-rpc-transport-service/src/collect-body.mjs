export class BodyReadError extends Error {
    status;
    code;
    constructor(status, code, message, options){
        super(message, options);
        this.name = "BodyReadError";
        this.status = status;
        this.code = code;
    }
}
function limit(value, fallback, name) {
    const selected = value ?? fallback;
    if (Number.isNaN(selected) || selected < 0) throw new RangeError(`${name} must be a non-negative number`);
    return selected;
}
function cancel(reader, reason) {
    void reader.cancel(reason).catch(()=>{});
}
export async function collectBody(stream, maximum, label, signal) {
    if (!stream) {
        signal?.throwIfAborted();
        return new Uint8Array(0);
    }
    const reader = stream.getReader();
    let rejectAbort;
    const aborted = new Promise((_resolve, reject)=>{
        rejectAbort = reject;
    });
    const abort = ()=>{
        cancel(reader, signal?.reason);
        rejectAbort(signal?.reason);
    };
    signal?.addEventListener("abort", abort, {
        once: true
    });
    const chunks = [];
    let size = 0;
    try {
        if (signal?.aborted) {
            cancel(reader, signal.reason);
            signal.throwIfAborted();
        }
        while(true){
            const result = await Promise.race([
                reader.read(),
                aborted
            ]);
            signal?.throwIfAborted();
            if (result.done) break;
            size += result.value.byteLength;
            if (size > maximum) throw new BodyReadError(413, "body-too-large", `${label} exceeded ${maximum} bytes`);
            chunks.push(result.value.slice());
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks){
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        }
        return bytes;
    } catch (error) {
        cancel(reader, error);
        if (error instanceof BodyReadError) throw error;
        if (signal?.aborted) throw signal.reason;
        throw new BodyReadError(400, "invalid-body", "could not read request body", {
            cause: error
        });
    } finally{
        signal?.removeEventListener("abort", abort);
        reader.releaseLock();
    }
}
