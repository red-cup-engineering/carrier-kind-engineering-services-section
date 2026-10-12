export declare function resolveAdmissionPolicy(config: {
  admitEmail?: (email: string) => boolean;
  allowedEmail?: string;
  allowedEmails?: readonly string[] | string;
}): (email: string) => boolean;

export declare function parseAllowedEmails(value: readonly string[] | string | undefined): string[];

export declare function judgePrincipalAdmission(
  identity: { email: string; emailVerified: boolean },
  admit: (email: string) => boolean,
): { admitted: true; email: string } | { admitted: false; reason: string };
