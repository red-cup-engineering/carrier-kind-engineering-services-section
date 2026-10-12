/** Type surface of the exact-pinned actor package, which ships ESM only. */
declare module "@red-cup-engineering/actor" {
  export interface DerivedIncumbencySeat {
    readonly office?: string;
    readonly holder?: string;
    readonly state?: string;
    readonly valid: boolean;
  }
  export function deriveIncumbencyRegister(input: Readonly<{ repoRoot: string; schemaPath?: string }>): Readonly<{
    seats: readonly DerivedIncumbencySeat[];
  }>;
}
