/**
 * The compute binding: how an offer names the typed operation it sells.
 *
 * "Accepting payment for a compute" is one upstream capability. An offer
 * declaration therefore carries no code; it names a package, an export, and
 * an argument projection, and the market resolves that binding by import.
 * Selling a new function is a catalog entry, never a new gateway.
 *
 * A binding is `{package, subpath?, export, args?, configuration?}`. `args` is a list of
 * dotted paths into the request context `{body, query, params, env}`, or into
 * the offer's own declaration as `offer.<field>` (so one function can sell
 * several offers, each passing its own `operation`), one per positional
 * argument; it defaults to `["body"]` for a POST offer and to
 * the offer's sole path parameter (or `["query"]` when the route has none)
 * for a GET offer.
 */

const PATH_PARAMETER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/gu;
const ARGUMENT_PATH = /^(body|query|params|env|offer)(\.[A-Za-z0-9_-]+)*$/u;

function requireBinding(binding, name) {
  if (binding === null || typeof binding !== "object" || Array.isArray(binding)) {
    throw new TypeError(`${name} binding must be an object {package, subpath?, export, args?}`);
  }
  if (typeof binding.package !== "string" || binding.package === "") throw new TypeError(`${name} binding requires a package name`);
  if (typeof binding.export !== "string" || binding.export === "") throw new TypeError(`${name} binding requires an export name`);
  if (binding.subpath !== undefined && !/^\.\/\S+$/u.test(binding.subpath)) throw new TypeError(`${name} binding subpath must start with ./`);
  if (binding.configuration !== undefined && (binding.configuration === null || typeof binding.configuration !== "object" || Array.isArray(binding.configuration))) throw new TypeError(`${name} binding configuration must be an object`);
  if (binding.args !== undefined) {
    if (!Array.isArray(binding.args) || binding.args.some((path) => !ARGUMENT_PATH.test(path))) {
      throw new TypeError(`${name} binding args must be dotted paths into body, query, params, env, or offer`);
    }
  }
  return binding;
}

/** The module specifier a binding imports: the package root or one of its subpath exports. */
export function bindingSpecifier(binding) {
  const { package: name, subpath } = requireBinding(binding, "compute");
  return subpath === undefined ? name : `${name}/${subpath.slice(2)}`;
}

/**
 * The default argument projection for an offer's method and route.
 * @param {{method: string, route: string}} declaration
 * @returns {readonly string[]}
 */
export function defaultArguments({ method, route }) {
  if (method === "POST") return Object.freeze(["body"]);
  const parameters = [...route.matchAll(PATH_PARAMETER)].map((match) => match[1]);
  if (parameters.length === 1) return Object.freeze([`params.${parameters[0]}`]);
  return Object.freeze(["query"]);
}

function readPath(context, path) {
  let value = context;
  for (const segment of path.split(".")) {
    if (value === null || value === undefined) return undefined;
    if (!Object.hasOwn(value, segment)) return undefined;
    value = value[segment];
  }
  return value;
}

/**
 * Project one request context into the binding's positional arguments.
 * @param {object} binding
 * @param {{method: string, route: string}} declaration
 * @param {{body?: unknown, query?: object, params?: object, env?: object}} context
 * @returns {unknown[]}
 */
export function projectArguments(binding, declaration, context) {
  const paths = requireBinding(binding, "compute").args ?? defaultArguments(declaration);
  return paths.map((path) => readPath(path.startsWith("offer") ? { offer: declaration } : context, path));
}

/**
 * Resolve one binding to a callable, importing its module once.
 *
 * @param {object} binding A compute or validate binding from an offer declaration.
 * @param {{method: string, route: string}} declaration The offer's declaration, for the default argument projection.
 * @param {{load?: (specifier: string) => Promise<object>}} [options] The module loader; defaults to dynamic import.
 * @returns {(context: {body?: unknown, query?: object, params?: object, env?: object}) => Promise<unknown>}
 */
export function resolveBinding(binding, declaration, { load = (specifier) => import(specifier) } = {}) {
  const source = requireBinding(binding, "compute");
  // An offer's admitted operation cannot change while its first import is
  // pending. Retain a private projection instead of a mutable caller record.
  const admitted = Object.freeze({ ...source, ...(source.args === undefined ? {} : { args: Object.freeze([...source.args]) }) });
  const operation = Object.freeze({ ...declaration });
  const specifier = bindingSpecifier(admitted);
  let loaded;
  async function callable() {
    if (loaded === undefined) {
      loaded = (async () => {
        const module = await load(specifier);
        const candidate = module !== null && module !== undefined && Object.hasOwn(module, admitted.export) ? module[admitted.export] : undefined;
        if (typeof candidate === "function") return candidate;
        // A house operation (built with rpc/operation's `operation({...})`, a
        // systems-layer construct this networking-layer module never imports)
        // is a frozen record carrying `execute`, not a bare function. Selling
        // one is naming its export the same way any other function is named;
        // the market calls its typed executor with the one projected input.
        if (candidate !== null && typeof candidate === "object" && typeof candidate.execute === "function") {
          return (input) => candidate.execute(input);
        }
        throw new TypeError(`${specifier} exports no function named ${admitted.export}`);
      })();
    }
    const attempt = loaded;
    try {
      return await attempt;
    } catch (error) {
      // Share one in-flight load, but do not permanently poison a seller after
      // a transient loader failure. A handler failure never evicts its module.
      if (loaded === attempt) loaded = undefined;
      throw error;
    }
  }
  return async function invoke(context) {
    const fn = await callable();
    return fn(...projectArguments(admitted, operation, context));
  };
}

/**
 * Admit each offer's sample through its ORIGINAL validation binding before
 * seller compilation. The declaration's own offer coordinates (including
 * compute configuration) are available without host effects; only genuine
 * environment/path arguments must await configured runtime receiving.
 * This is reusable Networking machinery, not another market-specific law.
 */
export async function admitOfferExamples(declarations, { load } = {}) {
  if (!Array.isArray(declarations))
    throw new TypeError("offer example admission requires declaration records");
  const refused = [];
  for (const declaration of declarations) {
    if (!declaration?.validate) continue;
    const paths = declaration.validate.args ?? defaultArguments(declaration);
    if (paths.some(path => /^(env|params)(\\.|$)/u.test(path))) continue;
    try {
      await resolveBinding(declaration.validate, declaration, load ? { load } : {})({
        body: declaration.bodyExample,
        query: declaration.queryExample ?? {},
      });
    } catch (error) {
      refused.push(String(declaration.method) + " " + String(declaration.route) + ": " +
        (error instanceof Error ? error.message : String(error)));
    }
  }
  if (refused.length)
    throw new TypeError("offer examples refused by their own validation:\\n" + refused.join("\\n"));
}
