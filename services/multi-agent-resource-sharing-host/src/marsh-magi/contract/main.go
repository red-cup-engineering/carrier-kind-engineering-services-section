// MARSH — the Magi Network (formerly VSC) WASM contract for the Blockchain Agent Engine's Hive
// resource world. The same semantics as MARSH.sol (this package's EVM engine) and
// MARSH.hive-engine.js (this package's Hive-Engine sidechain contract), ported to Hive's other
// contract layer: a general-purpose WASM VM (github.com/vsc-eco/go-vsc-node), where a resource's
// semantic body and evidence remain content-addressed carriers outside the chain and this
// contract stores only the current typed head per resource, admitting or transitioning it.
//
// This file is written against the real `go-contract-template` scaffold
// (git clone https://github.com/vsc-eco/go-contract-template) and belongs at that template's
// `contract/main.go`, replacing its own — it imports "contract-template/sdk" exactly as the
// template's own examples do, and is not itself a standalone Go module (the template's go.mod,
// go.sum, sdk/, and runtime/ packages are required alongside it).
//
// Build (inside the template, after copying this file in):
//
//	tinygo build -gc=custom -scheduler=none -panic=trap -no-debug \
//	  -target=wasm-unknown -o artifacts/main.wasm ./contract
//	wasm-strip -o artifacts/main-striped.wasm artifacts/main.wasm
//
// Deploy (the one step this contract needs; ~10 HBD, from a funded Hive account's active key):
//
//	vsc-contract-deploy -init   # writes data/config/identityConfig.json to fill in
//	vsc-contract-deploy -wasmPath artifacts/main-striped.wasm -name "marsh"
//
// Not run in this environment: TinyGo, WasmEdge/Wabt, and a synced Hive testnet node are not
// installed here (see the companion research note, S6-S7). The Go source below type-checks
// against the real template's sdk package (verified 2026-09-26 by dropping it into a fresh
// clone) but has not itself been compiled to WASM.
//
// State layout (Magi's sdk.StateSetObject/StateGetObject are a flat string key/value store, no
// tables — the same "resources/<resourceId>/<field>" path-per-field convention the template's
// own token example uses for "accs/<address>/bal"):
//
//	resources/<resourceId>/controller  -> the admitting caller's address (sdk.Address, as string)
//	resources/<resourceId>/kind        -> a resource kind label
//	resources/<resourceId>/content     -> the current content head
//	resources/<resourceId>/evidence    -> the current evidence head
//	resources/<resourceId>/sequence    -> a decimal uint64 string, starting at "1"
//
// resourceId domain separation is the caller's job (as it is for the Hive-Engine and EVM
// engines): a resourceId already names its controller, kind, and subject, so this contract does
// not additionally hash or namespace it.
package main

import (
	"contract-template/sdk"
	"strconv"
	"strings"
)

func resourceKey(resourceId string, field string) string {
	return "resources/" + resourceId + "/" + field
}

func resourceExists(resourceId string) bool {
	return sdk.StateGetObject(resourceKey(resourceId, "controller")) != nil
}

func resourceController(resourceId string) string {
	v := sdk.StateGetObject(resourceKey(resourceId, "controller"))
	if v == nil {
		return ""
	}
	return *v
}

func resourceContent(resourceId string) string {
	v := sdk.StateGetObject(resourceKey(resourceId, "content"))
	if v == nil {
		return ""
	}
	return *v
}

func resourceSequence(resourceId string) uint64 {
	v := sdk.StateGetObject(resourceKey(resourceId, "sequence"))
	if v == nil {
		return 0
	}
	n, err := strconv.ParseUint(*v, 10, 64)
	if err != nil {
		sdk.Abort("marsh: corrupt sequence for " + resourceId)
	}
	return n
}

// Admit the first typed, content-addressed state of a resource.
// Argument: a comma-separated "resourceId,kind,content,evidence" string, mirroring the
// template's own Transfer(a *string) convention for multi-field string arguments.
//
//go:wasmexport admitResource
func AdmitResource(a *string) *string {
	params := strings.SplitN(*a, ",", 4)
	if len(params) != 4 {
		sdk.Abort("marsh: admitResource needs resourceId,kind,content,evidence")
	}
	resourceId, kind, content, evidence := params[0], params[1], params[2], params[3]
	if resourceId == "" || kind == "" || content == "" || evidence == "" {
		sdk.Abort("marsh: admitResource fields must be non-empty")
	}
	if resourceExists(resourceId) {
		sdk.Revert("resource already exists", "marsh_resource_exists")
	}

	env := sdk.GetEnv()
	controller := env.Sender.Address.String()
	sdk.StateSetObject(resourceKey(resourceId, "controller"), controller)
	sdk.StateSetObject(resourceKey(resourceId, "kind"), kind)
	sdk.StateSetObject(resourceKey(resourceId, "content"), content)
	sdk.StateSetObject(resourceKey(resourceId, "evidence"), evidence)
	sdk.StateSetObject(resourceKey(resourceId, "sequence"), "1")
	sdk.Log("marsh.resourceAdmitted " + resourceId)
	return nil
}

// Replace a resource head only from its current content head (a compare-and-swap transition),
// only by the resource's own controller. Argument: a comma-separated
// "resourceId,priorContent,content,evidence" string.
//
//go:wasmexport transitionResource
func TransitionResource(a *string) *string {
	params := strings.SplitN(*a, ",", 4)
	if len(params) != 4 {
		sdk.Abort("marsh: transitionResource needs resourceId,priorContent,content,evidence")
	}
	resourceId, priorContent, content, evidence := params[0], params[1], params[2], params[3]
	if resourceId == "" || content == "" || evidence == "" {
		sdk.Abort("marsh: transitionResource fields must be non-empty")
	}
	if !resourceExists(resourceId) {
		sdk.Revert("resource not found", "marsh_resource_not_found")
	}

	env := sdk.GetEnv()
	caller := env.Sender.Address.String()
	if resourceController(resourceId) != caller {
		sdk.Revert("controller required", "marsh_controller_required")
	}
	if resourceContent(resourceId) != priorContent {
		sdk.Revert("prior content mismatch", "marsh_prior_content_mismatch")
	}

	sequence := resourceSequence(resourceId) + 1
	sdk.StateSetObject(resourceKey(resourceId, "content"), content)
	sdk.StateSetObject(resourceKey(resourceId, "evidence"), evidence)
	sdk.StateSetObject(resourceKey(resourceId, "sequence"), strconv.FormatUint(sequence, 10))
	sdk.Log("marsh.resourceTransitioned " + resourceId)
	return nil
}

// Read one resource's current head. Argument: the resourceId. Returns a comma-separated
// "controller,kind,content,evidence,sequence" string, or "" if the resource does not exist —
// a keyless read a Node client can also perform directly via sdk.ContractStateGet, exposed here
// as a convenience single call.
//
//go:wasmexport getResource
func GetResource(a *string) *string {
	resourceId := *a
	if !resourceExists(resourceId) {
		empty := ""
		return &empty
	}
	kind := sdk.StateGetObject(resourceKey(resourceId, "kind"))
	content := resourceContent(resourceId)
	evidence := sdk.StateGetObject(resourceKey(resourceId, "evidence"))
	out := strings.Join([]string{
		resourceController(resourceId),
		*kind,
		content,
		*evidence,
		strconv.FormatUint(resourceSequence(resourceId), 10),
	}, ",")
	return &out
}
