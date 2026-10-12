export declare function relayToGoogleConsent(params: {
  state: string;
  googleClientId: string;
  publicBaseUrl: string;
  scopes?: readonly string[] | string;
  redirectPath?: string;
  codeChallenge?: string;
  nonce?: string;
  accessType?: "online" | "offline";
  prompt?: string;
  loginHint?: string;
}): string;
