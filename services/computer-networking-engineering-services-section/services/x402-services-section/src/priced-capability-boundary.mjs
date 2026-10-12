function requireFunction(value, name) {
  if (typeof value !== "function") throw new TypeError(`${name} must be an injected function`);
  return value;
}

function requireObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requirePath(value, name) {
  if (typeof value !== "string" || !/^\/\S+$/u.test(value)) {
    throw new TypeError(`${name} must be an absolute HTTP path`);
  }
  return value;
}

function requireOperation(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("operation must be a nonempty capability operation");
  }
  return value;
}

function priceConfiguration(value) {
  const terms = requireObject(value, "priceTerms");
  if (!/^eip155:[1-9][0-9]*$/u.test(terms.network ?? "")) {
    throw new TypeError("priceTerms.network must be an explicit EVM CAIP-2 identifier");
  }
  if (!/^[1-9][0-9]*$/u.test(terms.amount ?? "")) {
    throw new TypeError("priceTerms.amount must be positive canonical atomic units");
  }
  if (typeof terms.asset !== "string" || terms.asset === "") {
    throw new TypeError("priceTerms.asset is required");
  }
  if (typeof terms.payTo !== "string" || terms.payTo === "") {
    throw new TypeError("priceTerms.payTo is required");
  }
  return terms;
}

function recoveredState(value) {
  const recovered = requireObject(value, "recoveredRecords");
  if (!(recovered.intents instanceof Map) || !(recovered.terminals instanceof Map)) {
    throw new TypeError("recoveredRecords must provide intents and terminals Maps");
  }
  return {
    intents: new Map(recovered.intents),
    terminals: new Map(recovered.terminals),
  };
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function requirePublicReference(value, name) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,256}$/u.test(value)) {
    throw new TypeError(`${name} must be one URL-safe opaque reference`);
  }
  return value;
}

/**
 * Realize the durable seller lifecycle shared by priced Capability Cells.
 *
 * The customer cell injects its operation, contracts, persistence, authority
 * admission, and executable behavior. This provider owns only the causal HTTP
 * and x402 lifecycle. Amounts remain atomic-unit strings at this settlement
 * boundary; price formation remains upstream and exact-rational.
 */
export function createPricedCapabilityBoundary({
  operation,
  resourcePath,
  offerPath,
  resultPath,
  offer,
  priceTerms,
  admit,
  append,
  execute,
  recoveredRecords,
  facilitatorUrl,
  facilitatorClient,
  paymentBoundaryFactory,
  paymentIdentity,
  settlementProjection,
  createPublicReference,
  recoverPublicReference,
  projectPublicResult,
  createIntent = ({ invocation, request, publicReference }) => ({
    type: "PricedCapabilityInvocationIntent",
    invocation,
    publicReference,
    operation,
    request,
  }),
  createReceipt = ({ invocation, settlement, result }) => ({
    type: "PricedCapabilityInvocationReceipt",
    invocation,
    operation,
    settlement,
    result,
  }),
  createRefusal = ({ invocation, settlement, error }) => ({
    type: "PricedCapabilityInvocationRefusal",
    invocation,
    operation,
    settlement,
    refusal: { type: "CapabilityExecutionRefusal", reason: errorMessage(error) },
  }),
} = {}) {
  const selectedOperation = requireOperation(operation);
  const invokeRoute = requirePath(resourcePath, "resourcePath");
  const publicOfferRoute = requirePath(offerPath, "offerPath");
  const publicResultRoute = requirePath(resultPath, "resultPath");
  const publishedOffer = requireObject(offer, "offer");
  const price = priceConfiguration(priceTerms);
  const admitInvocation = requireFunction(admit, "admit");
  const appendRecord = requireFunction(append, "append");
  const executeCapability = requireFunction(execute, "execute");
  const makeIntent = requireFunction(createIntent, "createIntent");
  const makeReceipt = requireFunction(createReceipt, "createReceipt");
  const makeRefusal = requireFunction(createRefusal, "createRefusal");
  const identifyPayment = requireFunction(paymentIdentity, "paymentIdentity");
  const projectSettlement = requireFunction(settlementProjection, "settlementProjection");
  const makePaymentBoundary = requireFunction(paymentBoundaryFactory, "paymentBoundaryFactory");
  const makePublicReference = requireFunction(createPublicReference, "createPublicReference");
  const recoverReference = requireFunction(recoverPublicReference, "recoverPublicReference");
  const projectResult = requireFunction(projectPublicResult, "projectPublicResult");
  const { intents, terminals } = recoveredState(recoveredRecords);
  const executions = new Map();
  const retentions = new Map();
  const publicReferences = new Map();
  const referencesByInvocation = new Map();
  const reservedReferences = new Map();

  function recoverAndCachePublicReference(invocation, intent) {
    const cached = referencesByInvocation.get(invocation);
    if (cached !== undefined) return cached;
    const publicReference = requirePublicReference(
      recoverReference({ invocation, intent, operation: selectedOperation }),
      "recovered public reference",
    );
    const existing = publicReferences.get(publicReference);
    if (existing !== undefined && existing !== invocation) {
      throw new TypeError("recovered public reference is assigned to multiple invocations");
    }
    publicReferences.set(publicReference, invocation);
    referencesByInvocation.set(invocation, publicReference);
    return publicReference;
  }

  for (const [invocation, intent] of intents) recoverAndCachePublicReference(invocation, intent);
  for (const invocation of terminals.keys()) {
    if (!intents.has(invocation)) throw new TypeError("recovered terminal has no durable matching invocation intent");
  }

  async function retainIntent(invocation, request) {
    if (intents.has(invocation) || terminals.has(invocation)) return intents.get(invocation);
    if (retentions.has(invocation)) return retentions.get(invocation);
    const retention = (async () => {
      const publicReference = requirePublicReference(
        await makePublicReference({ invocation, request, operation: selectedOperation }),
        "created public reference",
      );
      const existing = publicReferences.get(publicReference);
      const reserved = reservedReferences.get(publicReference);
      if ((existing !== undefined && existing !== invocation) || (reserved !== undefined && reserved !== invocation)) {
        throw new TypeError("created public reference is already assigned to another invocation");
      }
      reservedReferences.set(publicReference, invocation);
      try {
        const intent = requireObject(makeIntent({
          invocation,
          request: structuredClone(request),
          operation: selectedOperation,
          publicReference,
        }), "created invocation intent");
        if (intent.invocation !== invocation || intent.publicReference !== publicReference) {
          throw new TypeError("created invocation intent must durably retain its invocation and public reference");
        }
        const recoveredReference = requirePublicReference(
          recoverReference({ invocation, intent, operation: selectedOperation }),
          "created intent public reference",
        );
        if (recoveredReference !== publicReference) {
          throw new TypeError("created invocation intent public reference does not round-trip through recovery policy");
        }
        await appendRecord(intent);
        intents.set(invocation, intent);
        publicReferences.set(publicReference, invocation);
        referencesByInvocation.set(invocation, publicReference);
        return intent;
      } finally {
        if (reservedReferences.get(publicReference) === invocation) reservedReferences.delete(publicReference);
      }
    })();
    retentions.set(invocation, retention);
    try {
      return await retention;
    } finally {
      retentions.delete(invocation);
    }
  }

  async function afterSettle(event) {
    const settlement = projectSettlement(event);
    const invocation = settlement.invocation;
    if (terminals.has(invocation)) return terminals.get(invocation);
    if (executions.has(invocation)) return executions.get(invocation);
    const intent = intents.get(invocation);
    if (intent === undefined) throw new Error("settled payment has no durable matching invocation intent");

    const execution = (async () => {
      let terminal;
      try {
        const result = await executeCapability({
          invocation,
          intent,
          settlement,
          operation: selectedOperation,
        });
        terminal = makeReceipt({ invocation, intent, settlement, result });
      } catch (error) {
        terminal = makeRefusal({ invocation, intent, settlement, error });
      }
      await appendRecord(terminal);
      terminals.set(invocation, terminal);
      return terminal;
    })();
    executions.set(invocation, execution);
    try {
      return await execution;
    } finally {
      executions.delete(invocation);
    }
  }

  const paymentBoundary = makePaymentBoundary({
    network: price.network,
    ...(facilitatorClient === undefined ? { facilitatorUrl } : { facilitatorClient }),
    routes: {
      [`POST ${invokeRoute}`]: {
        accepts: [{
          scheme: "exact",
          network: price.network,
          price: {
            amount: price.amount,
            asset: price.asset,
            ...(price.extra === undefined ? {} : { extra: price.extra }),
          },
          payTo: price.payTo,
        }],
        ...(price.description === undefined ? {} : { description: price.description }),
      },
    },
    afterSettle,
  });

  function paymentHeader(request) {
    return request.get?.("payment-signature") ?? request.headers?.["payment-signature"];
  }

  async function admissionHandler(request, response, next) {
    try {
      await admitInvocation({
        request,
        operation: selectedOperation,
        offer: publishedOffer,
        priceTerms: price,
      });
      next();
    } catch (error) {
      response.status(403).json({
        ok: false,
        refusal: { type: "CapabilityAdmissionRefusal" },
      });
    }
  }

  async function retainIntentHandler(request, response, next) {
    try {
      const header = paymentHeader(request);
      if (header !== undefined) {
        const invocation = identifyPayment(header);
        await retainIntent(invocation, request.body);
      }
      next();
    } catch (error) {
      response.status(400).json({
        ok: false,
        refusal: { type: "CapabilityInvocationIntentRefusal" },
      });
    }
  }

  function invokeHandler(request, response) {
    const invocation = identifyPayment(paymentHeader(request));
    const intent = intents.get(invocation);
    if (intent === undefined) throw new Error("payment invocation has no durable matching intent");
    const publicReference = referencesByInvocation.get(invocation);
    if (publicReference === undefined) throw new Error("payment invocation has no recovered public reference");
    response.status(202).json(projectResult({
      phase: "invocation",
      status: terminals.has(invocation) ? "terminal" : "settlement-pending",
      publicReference,
      result: `${publicResultRoute}/${publicReference}`,
      invocation,
      intent,
      operation: selectedOperation,
    }));
  }

  function offerHandler(_request, response) {
    response.json({ ...publishedOffer, pricing: priceTerms });
  }

  function resultHandler(request, response) {
    const publicReference = request.params?.id ?? "";
    const invocation = publicReferences.get(publicReference);
    if (invocation === undefined) {
      response.status(404).json({
        ok: false,
        reference: publicReference,
        refusal: { type: "CapabilityInvocationNotFound" },
      });
      return;
    }
    const intent = intents.get(invocation);
    if (intent === undefined) throw new Error("public invocation reference has no durable matching intent");
    const terminal = terminals.get(invocation);
    if (terminal !== undefined) {
      response.status(200).json(projectResult({
        status: "terminal",
        publicReference,
        invocation,
        intent,
        terminal,
        operation: selectedOperation,
      }));
      return;
    }
    if (intents.has(invocation) || executions.has(invocation)) {
      response.status(202).json(projectResult({
        status: "pending",
        publicReference,
        invocation,
        intent,
        operation: selectedOperation,
      }));
      return;
    }
    throw new Error("public invocation reference is inconsistent with the recovered lifecycle");
  }

  function install(app) {
    app.get(publicOfferRoute, offerHandler);
    app.post(invokeRoute, admissionHandler, retainIntentHandler, paymentBoundary.middleware, invokeHandler);
    app.get(`${publicResultRoute}/:id`, resultHandler);
    return app;
  }

  return Object.freeze({
    operation: selectedOperation,
    resourcePath: invokeRoute,
    offerPath: publicOfferRoute,
    resultPath: publicResultRoute,
    paymentBoundary,
    afterSettle,
    admissionHandler,
    retainIntentHandler,
    invokeHandler,
    offerHandler,
    resultHandler,
    install,
  });
}
