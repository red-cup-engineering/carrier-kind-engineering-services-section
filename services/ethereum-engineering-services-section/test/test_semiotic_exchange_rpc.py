import importlib.util
import pathlib
import sys
import unittest

sys.dont_write_bytecode = True
path = pathlib.Path(__file__).parents[1] / "scripts" / "serve-semiotic-exchange-rpc.py"
spec = importlib.util.spec_from_file_location("semiotic_exchange_rpc", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AdmissionTest(unittest.TestCase):
    def test_successor_configuration_is_exact(self):
        self.assertEqual(module.CONFIG["chainId"], "eip155:5615611")
        self.assertEqual(module.CONFIG["nodeUnit"], "union-alpha-chain-5615611-node.service")
        self.assertEqual(module.CHAIN_RPC, "http://10.128.0.2:8563")
        self.assertEqual(module.EXCHANGE, "0xc4234dc42c9d93bc7d61b0354aba2729ae52e322")
        self.assertEqual(module.DEPLOYMENT_BLOCK, 70)
        self.assertEqual(len(module.EVENT_TOPICS), 6)

    def test_admits_only_head_and_exact_bounded_exchange_logs(self):
        self.assertEqual(module.admit_rpc({"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []})["method"], "eth_blockNumber")
        exact = {"jsonrpc": "2.0", "id": 1, "method": "eth_getLogs", "params": [{
            "address": module.EXCHANGE,
            "fromBlock": hex(module.DEPLOYMENT_BLOCK),
            "toBlock": hex(module.DEPLOYMENT_BLOCK + 1),
            "topics": [module.EVENT_TOPICS],
        }]}
        self.assertEqual(module.admit_rpc(exact), exact)
        for foreign in [
            {**exact, "method": "admin_peers"},
            {**exact, "params": [{**exact["params"][0], "address": "0x" + "00" * 20}]},
            {**exact, "params": [{**exact["params"][0], "fromBlock": "0x1"}]},
            {**exact, "params": [{**exact["params"][0], "topics": []}]},
        ]:
            with self.assertRaises(ValueError):
                module.admit_rpc(foreign)

    def test_rejects_reversed_interval_and_former_exchange(self):
        exact = {"jsonrpc": "2.0", "id": 1, "method": "eth_getLogs", "params": [{
            "address": module.EXCHANGE,
            "fromBlock": hex(module.DEPLOYMENT_BLOCK + 1),
            "toBlock": hex(module.DEPLOYMENT_BLOCK),
            "topics": [module.EVENT_TOPICS],
        }]}
        with self.assertRaises(ValueError):
            module.admit_rpc(exact)
        exact["params"][0]["fromBlock"] = hex(module.DEPLOYMENT_BLOCK)
        exact["params"][0]["address"] = "0x98bbc65824962b61df876a47b5779c4ecbbd4939"
        with self.assertRaises(ValueError):
            module.admit_rpc(exact)

    def test_reconciles_the_upstream_range_complement_without_widening_the_request(self):
        calls = []

        def bounded_upstream(request):
            query = request["params"][0]
            first, last = int(query["fromBlock"], 16), int(query["toBlock"], 16)
            calls.append((first, last))
            if last - first > 1:
                return {"jsonrpc": "2.0", "id": 1, "error": {"code": -32602, "message": "Requested range exceeds maximum RPC range limit"}}
            return {"jsonrpc": "2.0", "id": 1, "result": [{"blockNumber": hex(block)} for block in range(first, last + 1)]}

        request = {"jsonrpc": "2.0", "id": 1, "method": "eth_getLogs", "params": [{
            "address": module.EXCHANGE,
            "fromBlock": hex(module.DEPLOYMENT_BLOCK),
            "toBlock": hex(module.DEPLOYMENT_BLOCK + 4),
            "topics": [module.EVENT_TOPICS],
        }]}
        admitted = module.admit_rpc(request)
        response = module.reconcile_chain_range(admitted, bounded_upstream)
        self.assertEqual([int(log["blockNumber"], 16) for log in response["result"]], [70, 71, 72, 73, 74])
        self.assertEqual(calls[0], (70, 74))
        self.assertTrue(all(first >= 70 and last <= 74 for first, last in calls))


if __name__ == "__main__":
    unittest.main()
