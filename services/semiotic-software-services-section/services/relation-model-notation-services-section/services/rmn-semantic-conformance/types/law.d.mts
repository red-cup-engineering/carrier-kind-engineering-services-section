/** Pure placement-independent RMN die types. */
export interface CompiledRmlLaw {
  readonly value: Readonly<Record<string, unknown>>;
  readonly term: readonly unknown[];
  readonly bytes: Buffer;
  readonly id: string;
}
export function validateLawValue(value: unknown): Readonly<Record<string, unknown>>;
export function compileRmlLaw(source: string): CompiledRmlLaw;
export function decodeCompiledLaw(term: unknown): Readonly<Record<string, unknown>>;
