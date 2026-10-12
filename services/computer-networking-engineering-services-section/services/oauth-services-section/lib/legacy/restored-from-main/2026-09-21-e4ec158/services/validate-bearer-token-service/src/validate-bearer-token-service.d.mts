export type TokenRecord = { client_id: string; email: string; issuer?: string; subject?: string; expires_at: number };

export declare function validateBearerToken(
  token: string,
  tokens: Map<string, TokenRecord>,
  now?: number,
): { client_id: string; email: string; issuer?: string; subject?: string } | null;
