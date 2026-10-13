# x402 Services Section

This sovereign protocol provider supplies the Union's x402 v2 HTTP payment boundary using the official `@x402/*` implementation.
Customers supply one explicit route set, CAIP-2 EVM network, price/payee terms, and contracted facilitator.
The provider returns the standard middleware and settlement hook; it neither owns the customer's operation nor keeps an ambient payment ledger.

`exact` is the minimal default through the official x402 EVM implementation.
`batch-settlement` is opt-in and requires its separate receiver and channel state.
Facilitators accept the official `FacilitatorEvmSigner` shape without inventing a mandatory account-abstraction or semantic-database dependency.

The `./resource-observation` export assays one public x402 v2 challenge without paying.
The `./public-service-market-listing` export additionally verifies one signed A2A 1.0 Agent Card and admits a listing only when exactly one skill, sovereign circuit-law identity, Bazaar declaration, and EVM payment alternative match the customer's declared seller policy.
The returned listing and nested evidence are deterministically identified and immutable.

This section does not host a marketplace.
A customer such as `market.561.group` settlement may hire the admission circuit after that settlement has production authority and supplies its public endpoints and exact seller policy.
Payout addresses are never inferred from environment files; using the Ephemeris payee means supplying the same public `payTo`, network, and asset policy to both boundaries.
The Union Alpha deployment uses its own facilitator and EIP-3009 asset; no hosted facilitator owns settlement.

## One x402 collection

There is one package, `@red-cup-engineering/x402-services-section`, and one payment-boundary implementation. Its distinct operations are modules, not separately published services:

- `./market` serves declared offers; `./market-561-group` is the sole deployment configuration and catalog.
- `./market-observation/*` reads settlement facts; `./settlement-derivation/*` corroborates seller settlements.
- `./hbd/*` realizes the HBD scheme; `./hive/exit-tightness` exposes the one Hive product adapter.
- `./x402-settlement-evidence` retains facilitator observations bound to the signed payment; `./boundary-reference/*` observes a public boundary.

Product implementations that merely happen to be sold through x402 stay with their own product domain; they are consumers of this boundary, not a second x402 implementation.

## Priced capability result privacy

A priced capability must now explicitly supply `createPublicReference`, `recoverPublicReference`, and `projectPublicResult`.
The boundary persists the reference in the invocation intent before payment middleware runs, rebuilds its lookup from recovered intents, and exposes only the caller's projected status at the result route.
Raw intents, settlement evidence, and terminals remain private to the injected durable lifecycle unless a consumer deliberately projects particular fields.

A reference factory and recovery policy are consumer policy.
A publishing job uses an independently generated opaque reference and a minimal status projection.
The paid-data endpoint deliberately retains its documented payment-hash result route and terminal-visible public-data policy, including recovery of records created before this version.

Reference reservation deduplicates concurrent retention calls within one boundary process and does not publish a lookup until the caller's `append` has completed.
The caller still owns cross-process exclusion, durable append atomicity, recovery, and idempotence of the effect after settlement.
This boundary does not claim crash-exactly-once production.

## The market: one seller for every typed operation

Founder, 2026-09-11: "accepting payment for a compute" is one upstream capability, so it is realized once.
An offer declaration (`./offer`, `schemas/offer.schema.json`) MUST name the typed operation it sells by its `compute` binding (package, export, argument projection) and MAY name its admission by a `validate` binding and its scientific standing by `evidence`; `declareCatalog` admits the set one market serves and refuses a route or gateway/operation declared twice.
`./compute-binding` resolves a binding by import.
The market engine, `./market`, serves a whole catalog from one origin; `apps/market-561-group` is the one deployment, market.
561.group, and `data/market-561-group/records/catalog.json` is the one place an offer of the 561 Group is declared.

A seller MUST NOT carry a transport, a settlement witness, or a facilitator selection of its own: `x402SettlementEvidence` and `x402PaymentIdentity` (the root export) and `selectFacilitatorClient` (`./cdp-facilitator`) are the one owner of each.
The per-gateway copies in paid-ephemeris-gateway, paid-pacing-intelligence-gateway, paid-value-chain-gateway, and paid-orphan-patch-triage-gateway, the second seller engine paid-measure-endpoint-service, and the one-gateway engine x402-offer-seller-service were deleted on 2026-09-11; the canonical capability registry records each supersession.

Three native text offers sell strict UTF-8 encoding, fatal UTF-8 decoding and explicit NFC/NFD/NFKC/NFKD normalization at $0.0012 each. UTF-8 uses the existing exact media-typed Base64 carrier and preserves BOM, NUL and line endings. Invalid encodings and input/output beyond 65536 bytes refuse before quote. Compatibility normalization can change meaning; it does not perform case folding or transliteration. Per-offer true402 summaries retain complete sentences or words within its native limit and keep the method and public input link.

Eight byte/alphabet offers provide native Base16, padded Base32, Bitcoin-alphabet Base58 and unpadded Base64url encoding and decoding at $0.0012 per call. Encoders take the existing byte carrier; decoders require exact canonical text and a caller-supplied media type label. Both directions preserve byte counts and leading zeros. Limits are 65536 bytes for the linear formats and 1024 for Base58. Base58 does not add a checksum or verify wallet ownership. Transport admits JSON escape expansion within the documented byte limits.

Two MIME conversion offers sell native WHATWG Content-Type parsing and typed header serialization at /v1/data/mime-type-parse and /v1/data/mime-type-serialize, each $0.0012. Per-offer descriptors declare exact POST contracts and examples. Parsing follows the browser algorithm, including first-duplicate and malformed-parameter behavior; serialization refuses duplicate names rather than overwrite values. 4096 UTF-8 bytes/32 parameters with bounded JSON escape transport. These operations describe header labels; they do not authenticate bytes, infer content or validate IANA registration.

Eight existing FOUR evidence-algebra offers now execute directly on the Worker through the unchanged data-layer ./four primitive, eliminating their Node proxy dependency. Knowledge and truth join/meet remain distinct, family conversion is explicit, census accepts mixed naming families, and empty conjunction keeps the native vacuous unit. Existing endpoints, $0.001/$0.002 prices, 100 KiB request carrier and optional fields are preserved. Native preflight rejects unknown names and mixed-family operations before payment. Listings describe abstract points, not new witnesses or real-world truth authority.

Two RFC 6570 URI-template offers now sell bounded Level 4 expansion and syntax/variable inspection at $0.0012 each on the existing Worker. Both reject malformed requests before charging and carry explicit discoverable request/output contracts. The existing URI module owns the actual grammar and expansion; the house catalogue builder uses it instead of its ad hoc outbound substitution. Construction does not fetch or authorize a destination. Canonical vectors are supplemented by percent-encoded Unicode-prefix, own-property and amplification checks; observed signed local delivery uses an explicit facilitator double, not live funds.

Six content-address offers now sell SHA2 multihash creation/inspection/verification, CID inspection/base conversion and raw-block CID creation/verification at $0.0012 each on the existing Worker. Native multiformats replaces the existing manual multihash algorithms while the import/CLI profile remains. Comparisons return mismatch truthfully; raw verification refuses DAG/UnixFS and unsupported hashes. Exact bytes are bounded to 65536 and CID forms to 511 binary bytes/1024 characters, with full JSON escaping admitted. There is no upload, pinning, retrieval or authorship claim. URI expansion discovery uses an equivalent non-composed schema: typed flat lists/maps stay intact while native directory parsers can recover required template/variables fields.

Four CBOR offers sell JSON encoding, loss-refusing JSON decoding, diagnostic notation and RFC 8949 deterministic-encoding checks at $0.0012 each on the existing Worker. Native cbor2 replaces the handwritten house wire algorithms while preserving settlement-witness and HBD memo identities, iterative deep-array writing and root CLI/import operations. The reader now preserves BOM text and prototype-looking keys as data. JSON decoding refuses CBOR-only values; diagnostics retain them, and an encoding check does not claim tag semantics or application validity. Exact CBOR/JSON representations are bounded to 65536 bytes, 8192 nodes/events and depth 64, with full HTTP JSON escaping admitted. There are no model calls, storage or external computation.

Four XML offers sell ordered XML/JSON node conversion in both directions, serialization normalization, and XML 1.0 plus Namespaces 1.0 well-formedness checking at $0.0012 each on the existing Worker. Mixed text, qualified names, namespace declarations, CDATA, comments and processing instructions survive the node carrier. The shared native XML writer retains text CR and attribute tab/LF/CR through character references; SVG and RFCXML consumers retain their APIs, while HTML shares lexical escaping. Parsing uses @rgrove/parse-xml 5.0.0 and xml-name-validator 5.0.0. DTD/XML1.1, external entity fetching, XSD validation and C14N are outside this profile. Markup/namespace failure is a truthful paid false result from the checker; converters refuse it before payment. Limits and copyable request examples are in the seller catalogue and per-offer manifests. See xml-document-rendering-service for its ordered node contract and the qualified 62-case W3C fixture subset.

Six HTML offers sell character-reference encoding/decoding, parsed JSON document trees, native parsing diagnostics, link attributes and body text nodes at $0.0012 each on the existing Worker. Native parse5 8.0.1/entities 8.1.0 replace the custom five-entity/attribute/start-tag parser through actual SHP and Webmention consumers; URL attributes now decode exactly once and nested templates stay inert. The shared HTML lexical helpers retain carriage returns through receiving. Each offer has an executable example and explicit bounds; document diagnostics are not full conformance validation and body text is not browser layout. No model, fetching or separate host is required. See html-structural-projection-service for the actual contracts and qualified primary fixtures.

The JSON editing offers include RFC 6902 application, applicability checking and deterministic patch creation (`/v1/data/json-patch-apply`, `json-patch-check`, `json-patch-create`). Each costs $0.0012 in Base USDC and runs directly on the existing edge worker. Application returns `{present:true,value}` or `{present:false}` for root removal; checks sell an applicability result with the failing operation/rule. Creation emits standard operations with escaped paths and positional array edits, without a minimality claim. Requests/results are bounded to 64 KiB canonical JSON, 128 operations, 8,192 nodes, 4,096 array elements and physical depth 64.

Paid POST intake admits the received, decompressed UTF-8 JSON bytes through the existing bounded canonical JSON codec before quote or execution. Duplicate members, malformed UTF-8/Unicode and non-finite numbers are refused, with no lossy selection of one ambiguous operation. The received payment request still passes through the native x402 boundary; this introduces no payment format.

The free `/openapi.json` endpoint derives the served offers' methods, native input schemas/examples, query/path parameters, per-call prices, tags and declared response schemas from the same catalogue used for execution. The existing web server owns OpenAPI serialization; there is no additional registry or maintained specification. The public page, llms.txt and RFC 9727 API catalogue link it. Native directory projections can now retain response fields without implying runtime verification. JSON document absence, paid diagnostics and arbitrary JSON/array results keep their distinct contracts.

### HTTP-date conversions

`POST /v1/data/http-date-to-json` and `POST /v1/data/json-to-http-date` cost 0.0012 USDC each. The existing HTTP codec owns both conversions. Parse receives `{ "date": "Sun, 06 Nov 1994 08:49:37 GMT" }`; formatting receives explicit UTC `{ "year": 1994, "month": 11, "day": 6, "hour": 8, "minute": 49, "second": 37 }`. Both return the canonical IMF-fixdate, UTC fields, weekday, source format, leap-second flag and nullable Unix milliseconds.

The parser accepts the three [RFC 9110 HTTP-date forms](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.7), with strict ASCII casing/spacing, GMT, valid calendar/weekday and years 1900–9999. RFC 850's two-digit year requires `referenceUnixMilliseconds`; its 50-year horizon uses UTC calendar years, constraining February 29 to the last day of the target February. No ambient clock chooses a purchased interpretation. Leap notation `23:59:60` survives with `unixMilliseconds: null`; this does not certify historical leap insertion or fabricate a POSIX instant. Fixed small fields bound request/result below 4096 UTF-8 bytes. Invalid input is refused before quote. OpenAPI, catalogue, Bazaar and offer manifests derive from the same declarations.

The same receiving primitive backs existing conditional HTTP requests. Invalid dates and multiple date-header members are ignored rather than allowing generic JavaScript date parsing to select a cached/ranged representation. The existing cache opts into RFC 9111 case tolerance; the public conversion remains case sensitive. Authoring HTTP consumer evidence is separate from its installed host release.

### Native workload prices and economic evidence

The 69 POST conversion/standards offers now publish an owner-declared workload tariff in their single catalogue declaration. The starting $0.0012 includes 4096 UTF-8 bytes of canonical JSON input; each further started 4096-byte band adds 100 atomic USDC ($0.0001), capped at 9600 atomic USDC ($0.0096). Existing smaller input ceilings still apply. Whitespace and equivalent JSON escaping do not change the price. No buyer-supplied Content-Length, unsigned price, traffic counter or wall clock controls the charge.

The admitted body enters the official x402 HTTP adapter's getBody method; the SDK resolves its native DynamicPrice before verification. The same body and declaration therefore quote the same amount on payment return. A small-request authorization does not buy a larger-request tariff. Input refusals, access grants and recovered purchases retain their existing distinct paths. No separate quote token, repayment loop, worker, price table or synthetic settlement protocol exists.

Catalogue, OpenAPI, per-offer discovery and public descriptions derive the starting price, bands and maximum from that declaration. House capability offers carry the maximum tariff as their spending bound and explicitly require a native request quote; seller probes use their actual example's price. Exact settlement records retain the canonical input byte count, quoted amount, separately reported amount if any and declaration/sku in the existing private journal, without copying private request bodies. Node witness-journal consumers retain the same pricing basis.

This is a commercial workload tariff, not a benchmark of CPU consumption, provider monetary cost, physical EROEI or demand elasticity. WIT names witnessed change; tally requires matching counterparty evidence; physical and cognitive EROEI require declared distinct measurements. Neither a signature nor a quote is revenue, neither a prepared response nor a facilitator settlement report is customer acceptance, and traffic is not independent customer demand. Demand-based optimization and sovereign enterprise book custody remain separate unfinished capability work.

Seller books and observations

The 69 workload-priced standards offers declare the existing Engineering enterprise and legal entity, with an exact SHA-256 source-record reference checked during compilation. Catalogue, OpenAPI, native capability offers, seller probes and both settlement journals retain the same owner. The serving provider is the real market Service actor; gateway labels no longer mint fictional enterprises. Income accounts belong inside the declared enterprise book, not a mandatory gateway account. Other offers retain an unresolved seller until their commercial ownership is recovered. A source declaration is not proof of an admitted office or signer.

A facilitator success is retained as an observation, separately from independently verified transfers. A prepared HTTP status and response length are delivery observations, not proof of receipt or customer acceptance. Unknown acceptance remains null. No treasury transfer, revenue recognition or customer-demand classification is inferred from these observations.

The unused journal-shape-to-settled-demand reader and its synthetic totals are retired. Counterparty classification remains an evidence-based relationship reading and cannot establish payment, revenue or demand.

Verified cash and the financial consumer

The seller corroborator now checks the recorded transaction-time workload tariff, including its canonical input byte count, instead of requiring every transfer to equal the catalogue's starting price. Two receipt and canonical-block reads must agree on one successful Base USDC transfer. A missing or mismatched commercial snapshot holds attribution while retaining independently corroborated cash; the current catalogue cannot invent a historical seller. Cash is neither delivery nor customer acceptance.

Group Operations' `scripts/produce-group-financial-readout.mjs` consumes the declared `@red-cup-engineering/x402-services-section/seller-settlements` export. Financial reading uses Organizing's registry, book and outcome APIs directly; it does not initialize office execution to read books. Its native graded double-entry projection debits held-by-custodian assets and credits pending receipts, grouped by the recorded seller or held unallocated. It writes only to `METROPLAT_DATA_ROOT/records/x402/cash/`, with private file permissions, and excludes already-authored transfer identities. This is an informational projection, not admission into sovereign enterprise books. Incomplete observations hold existing evidence. The financial readout keeps acceptance unobserved; it does not record payments into the work-outcome journal.

Historical payment-derived judgments remain readable as claims, but standing, routing, settlement and income readers exclude them. The financial producer refreshes the existing derived judged-delivery book from actual judgments, preserving the original journal and authored ledger. Native deployment still requires one coherent source/supplier release; running the authoring producer in isolated state proves its transformation without proving installed custody or enterprise acceptance.

The financial reader can run outside the source checkout. Configure `METROPLAT_LEDGER_JOURNAL`, `GROUP_WALLET_REGISTRY`, `METROPLAT_AGENCY_ROOT`, `METROPLAT_DATA_ROOT` and `METROPLAT_WEB_DATA_DIR`; R2 credentials come from the process environment or explicit `X402_SECRETS_FILE`. `HIVE_CURATION_TIMER_UNIT` is optional. An explicitly configured `METROPLAT_REPOSITORY_ROOT` enables developer source defaults, including its `.env`; neither module discovers a laptop checkout on import. The new exports and workspace dependency still need a coherent immutable supplier release before installation.

An offer may quote exact native consideration as `price: { amountAtomic: "3", asset: "eip155:5615611/erc20:0x..." }`, using a full lower-case 20-byte address. Its native x402 route, capability Offer and seller assay must agree with that network and asset. Custom assets require explicit EIP-712 name/version from the deployment. Prices and workload bands remain exact atomic integers, without a dollar conversion or assumed token decimal count. Human discovery names the asset; the native discovery price identifies atomic units. The USD-only 402index derivation excludes these offers rather than inventing a USD rate. This enables native internal denominations in source; it neither issues a token nor proves an installed Besu facilitator, payments or receiving.

The HTTP boundary uses the official x402 exact-EVM resource server. The enterprise actor host declares the same official SDK directly, so signed ActivityPub++ compute does not install this commodity-market composition. Actor payment tasks carry A2A x402 metadata with v2 protocol objects and retain actual observations in the existing native processing journal; payment does not grant execution authority. House settlement assets and actor releases still require independent deployment qualification.

### Usage-based EVM computation

`createUptoEvmPaymentBoundary` and `createUptoEvmFetchPaymentBoundary` procure the existing official `@x402/evm/upto/server` scheme through the same transport providers as exact payments. The route price is the buyer-authorized ceiling. Express handlers use the upstream `setSettlementOverrides` export; Fetch handlers return the upstream `Settlement-Overrides` header with actual consideration. The shared native before-settle hook refuses noncanonical uint256 amounts or resolved consideration above the signed ceiling before invoking a facilitator. Zero is permitted. This consumes the official protocol instead of creating another quote or payment format.

Metering and resource-to-consideration policy remain with the actual compute owner. An elapsed interval is not CPU usage, tokens, RAM, monetary cost or physical energy. Without a handler override the official scheme settles its advertised maximum; a usage-billed producer must bind its actual meter and tariff before listing that claim. Permit2 contracts, facilitator support, approvals/sponsorship and rights must be qualified on the selected chain; this source addition does not activate a Besu token or public seller.

Both transports refuse a route selecting a different network from the boundary's registered network before facilitator discovery. Fetch strips the internal settlement override from successful, failed and persisted delivered response headers; only seller-produced response metadata controls settlement, never a request header. The existing recoverable exact-EVM purchase store refuses usage-based authorization until it has a separately qualified scheme contract.

The new HTTP controls use the genuine pinned SDK and explicit facilitator doubles: quote, signed-payload-shaped verification, actual-amount settlement, excessive/noncanonical consideration refusal, zero, chain binding, failure cancellation and internal-header isolation. They establish source behavior, not live signature validity, chain transfers, deployed metering or buyer acceptance. The fixed-price market catalog remains on its existing exact scheme until its owning declaration and meter are migrated.
