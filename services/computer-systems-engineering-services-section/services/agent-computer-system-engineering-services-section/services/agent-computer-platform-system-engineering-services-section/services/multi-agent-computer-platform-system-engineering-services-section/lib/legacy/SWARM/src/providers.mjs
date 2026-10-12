export const providers = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    env: ["GROQ_API_KEY", "API_KEY_GROQ_GROQCLOUD"],
  },
  nim: {
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    env: ["NVIDIA_API_KEY", "API_KEY_NVIDIA_NIM"],
  },
  cerebras: {
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    env: ["CEREBRAS_API_KEY", "API_KEY_CEREBRAS"],
  },
};

export function resolveProvider(providerName) {
  const provider = providers[providerName];
  if (!provider) {
    throw new Error(
      `Unsupported provider "${providerName}". Supported providers: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider;
}

export function resolveApiKey(providerName, options = {}) {
  const provider = resolveProvider(providerName);
  if (options.apiKey) return { apiKey: options.apiKey, envName: "apiKey" };
  const env = options.env ?? process.env;
  for (const envName of provider.env) {
    if (env[envName]) return { apiKey: env[envName], envName };
  }
  throw new Error(
    `Missing API key for provider "${providerName}". Set one of: ${provider.env.join(", ")}.`,
  );
}
