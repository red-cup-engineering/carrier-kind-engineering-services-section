import { type Row as EavtRow } from "@red-cup-engineering/eavt";
import { type Meme } from "./positing/fiber.mjs";
/**
 * Project one admitted positive EAVT assertion into its cell and witnessed charge.
 * @param row The canonical operational row.
 * @returns Cell terms and the unchanged transaction as positive evidence.
 * @throws {TypeError} When the row is not admitted by the EAVT owner.
 */
export declare function eavtToCell(row: EavtRow): Meme;
/**
 * Project positive witnesses into canonical operational rows.
 * @param charged Operational terms and scientific charge.
 * @returns One row per positive witness, retaining its complete transaction.
 * @throws {TypeError} When negative evidence is present or a row is inadmissible.
 */
export declare function cellToEavt(charged: Pick<Meme, "cell" | "charge">): EavtRow[];
