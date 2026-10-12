/** A concrete Euclidean presentation of the J26 incidence law proved in Lean. */
export type J26VertexName = "q0" | "q1" | "q2" | "q3" | "a" | "b" | "c" | "d";
export type J26Face = Readonly<{
    name: string;
    vertices: readonly J26VertexName[];
}>;
export declare const gyrobifastigiumJ26: any;
