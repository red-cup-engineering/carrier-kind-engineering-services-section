# Bounded JSON-RPC transport

Supplies `createJsonRpcTransport`, `callJsonRpc` and `requestJsonRpc` over Fetch. Decoded response collection preserves the existing byte limit, abort/cancellation and fatal UTF-8 decoding; HTTP and JSON-RPC failures remain failures. No media-type decoding, journal, provider identity or hiring authority is implied. Request-body decoding remains separate migration material. Registry publication and snapshot consumer migration remain unfinished.

Recovered from the machine snapshot at `14b57b72b02a9f4a9d506149b34aa51ce467ef0b`. The supplier contains only transport and bounded collection; the original HTTP request parsing and other consumers remain to migrate. A packed archive installed into an independent npm consumer demonstrated HTTP retrieval, oversized response refusal and RPC error refusal. Hive client integration retained its 90 existing protocol checks. These results do not establish deployment or complete Hive source closure.

The retained HTTP check had one local connection-refused failure before passing on rerun; reliable repeated transport behavior has not been established by that rerun.
