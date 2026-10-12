// Type declarations for @lenticule-science/metrologic/equality.
import type { Charge } from "../../bilattice/src/index.d.ts";
import type { IndexMorphism, Fiber, Order } from "../../hyperdoctrine/src/index.d.ts";

export function pairKey(s: string, o: string): string;
export function pairKeys(entities: string[]): string[];
export function diagonalMorphism(entities: string[]): IndexMorphism;
export function equalityAlongDiagonal(entities: string[], order: Order): Fiber;
export function classicalEquality(entities: string[]): Fiber;
export function paraconsistentEquality(entities: string[]): Fiber;
export function equalityAt(fiber: Fiber, s: string, o: string): Charge;
