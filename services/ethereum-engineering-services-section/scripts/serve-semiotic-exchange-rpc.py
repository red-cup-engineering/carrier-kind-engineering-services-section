#!/usr/bin/env python3
"""Fixed-policy SemioticExchange read membrane for a Workers VPC service."""

import json
import os
import re
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_CONFIG = Path(__file__).resolve().parents[1] / "content" / "config" / "union-alpha-chain-semiotic-exchange-reader.json"


def read_configuration(path=None):
    source = Path(path or os.environ.get("SEMIOTIC_EXCHANGE_READER_CONFIG", DEFAULT_CONFIG))
    value = json.loads(source.read_text(encoding="utf-8"))
    if value.get("type") != "UnionSemioticExchangeHistoryReaderConfiguration" or value.get("version") != 1:
        raise ValueError("a version 1 Union history-reader configuration is required")
    if value.get("chainId") != "eip155:5615611" or value.get("nodeUnit") != "union-alpha-chain-5615611-node.service":
        raise ValueError("history reader is not bound to the Union successor chain")
    membrane = value.get("membrane")
    if membrane != {"host": "10.128.0.2", "port": 8562, "path": "/v1/semiotic-exchange/rpc"}:
        raise ValueError("history reader membrane coordinate drift")
    if not re.fullmatch(r"0x[0-9a-f]{40}", value.get("exchange", "")):
        raise ValueError("one lowercase exchange address is required")
    topics = value.get("eventTopics")
    if not isinstance(topics, list) or len(topics) != 6 or any(not re.fullmatch(r"0x[0-9a-f]{64}", topic) for topic in topics):
        raise ValueError("the six exact SemioticExchange event topics are required")
    if not isinstance(value.get("deploymentBlock"), int) or value["deploymentBlock"] < 0:
        raise ValueError("a non-negative deployment block is required")
    if value.get("chainRpc") != "http://10.128.0.2:8563":
        raise ValueError("history reader upstream must be the private successor RPC")
    return value


CONFIG = read_configuration()
CHAIN_RPC = CONFIG["chainRpc"]
EXCHANGE = CONFIG["exchange"]
DEPLOYMENT_BLOCK = CONFIG["deploymentBlock"]
EVENT_TOPICS = CONFIG["eventTopics"]
MEMBRANE_PATH = CONFIG["membrane"]["path"]
HEX_BLOCK = re.compile(r"^0x(?:0|[1-9a-f][0-9a-f]*)$")


def admit_rpc(value):
    if not isinstance(value, dict) or value.get("jsonrpc") != "2.0" or value.get("id") != 1:
        raise ValueError("one JSON-RPC 2.0 request with id 1 is required")
    method, params = value.get("method"), value.get("params")
    if method == "eth_blockNumber" and params == []:
        return value
    if method != "eth_getLogs" or not isinstance(params, list) or len(params) != 1:
        raise ValueError("only eth_blockNumber and the fixed SemioticExchange eth_getLogs read are admitted")
    query = params[0]
    if not isinstance(query, dict) or set(query) != {"address", "fromBlock", "toBlock", "topics"}:
        raise ValueError("foreign log filter")
    if str(query["address"]).lower() != EXCHANGE:
        raise ValueError(f"foreign contract {str(query['address']).lower()}")
    if query["topics"] != [EVENT_TOPICS]:
        raise ValueError("foreign event topics")
    first, last = query["fromBlock"], query["toBlock"]
    if not isinstance(first, str) or not isinstance(last, str) or not HEX_BLOCK.fullmatch(first) or not HEX_BLOCK.fullmatch(last):
        raise ValueError("closed hexadecimal block interval required")
    if int(first, 16) < DEPLOYMENT_BLOCK or int(last, 16) < int(first, 16):
        raise ValueError("log interval is outside the deployed SemioticExchange history")
    return value


def call_chain(request):
    upstream = urllib.request.Request(CHAIN_RPC, data=json.dumps(request, separators=(",", ":")).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(upstream, timeout=60) as response:
        body = response.read(16 * 1024 * 1024 + 1)
    if len(body) > 16 * 1024 * 1024:
        raise ValueError("chain response exceeds the membrane bound")
    decoded = json.loads(body)
    if decoded.get("jsonrpc") != "2.0" or decoded.get("id") != 1 or not ("result" in decoded or "error" in decoded):
        raise ValueError("malformed chain response")
    return decoded


def reconcile_chain_range(request, call=call_chain):
    response = call(request)
    if request["method"] != "eth_getLogs" or "error" not in response:
        return response
    message = str(response.get("error", {}).get("message", ""))
    query = request["params"][0]
    first, last = int(query["fromBlock"], 16), int(query["toBlock"], 16)
    if "Requested range exceeds maximum RPC range limit" not in message or first >= last:
        return response
    middle = first + (last - first) // 2
    parts = []
    for lower, upper in ((first, middle), (middle + 1, last)):
        child = {**request, "params": [{**query, "fromBlock": hex(lower), "toBlock": hex(upper)}]}
        reconciled = reconcile_chain_range(child, call)
        if "error" in reconciled:
            return reconciled
        if not isinstance(reconciled.get("result"), list):
            raise ValueError("chain log response must be an array")
        parts.extend(reconciled["result"])
    return {"jsonrpc": "2.0", "id": 1, "result": parts}


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != MEMBRANE_PATH:
            return self.reply(404, {"error": "not found"})
        try:
            length = int(self.headers.get("content-length", "0"))
            if length < 1 or length > 16384:
                raise ValueError("bounded JSON body required")
            request = admit_rpc(json.loads(self.rfile.read(length)))
            decoded = reconcile_chain_range(request)
            self.reply(200, decoded)
        except (ValueError, json.JSONDecodeError) as error:
            self.reply(400, {"error": str(error)})
        except Exception:
            self.reply(503, {"error": "cloud chain unavailable"})

    def do_GET(self):
        self.reply(405, {"error": "method not allowed"}, {"Allow": "POST"})

    def log_message(self, _format, *_args):
        return

    def reply(self, status, value, extra=None):
        body = json.dumps(value, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        for name, entry in (extra or {}).items():
            self.send_header(name, entry)
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    host = os.environ.get("SEMIOTIC_EXCHANGE_RPC_HOST", CONFIG["membrane"]["host"])
    port = int(os.environ.get("SEMIOTIC_EXCHANGE_RPC_PORT", str(CONFIG["membrane"]["port"])))
    if host != CONFIG["membrane"]["host"] or port != CONFIG["membrane"]["port"]:
        raise SystemExit("the membrane binds only the cloud machine private address 10.128.0.2:8562")
    ThreadingHTTPServer((host, port), Handler).serve_forever()
