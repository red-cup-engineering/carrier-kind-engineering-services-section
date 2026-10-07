/-!
# Row — one golden-vector row and the JSON it is written as

A row is one application of a specification operation. `e` names the application,
`a` the operation, and `v` its arguments and result; `t`, given when the rows are
written, names the specification revision they were read off. The operation is a
Lean declaration name built with a double-backtick literal, so a row can only name
an operation the specification declares. The JSON is the
`lean-system/conformance/golden-vector` contract.
-/

namespace ObsmetrologiaConformance

/-- The JSON a row carries: names, truth values, tallies, lists and objects. -/
inductive Json where
  | str (s : String)
  | bool (b : Bool)
  | nat (n : Nat)
  | arr (items : List Json)
  | obj (fields : List (String × Json))
  deriving Inhabited

/-- A string as a JSON string literal (RFC 8259 §7). -/
def quote (s : String) : String :=
  let escape (c : Char) : String :=
    if c = '"' then "\\\""
    else if c = '\\' then "\\\\"
    else if c.toNat < 0x20 then
      let hex := Nat.toDigits 16 c.toNat
      "\\u" ++ String.ofList (List.replicate (4 - hex.length) '0' ++ hex)
    else c.toString
  "\"" ++ String.join (s.toList.map escape) ++ "\""

/-- The JSON text of a value. -/
partial def Json.render : Json → String
  | .str s => quote s
  | .bool b => if b then "true" else "false"
  | .nat n => toString n
  | .arr items => "[" ++ ",".intercalate (items.map Json.render) ++ "]"
  | .obj fields => "{" ++ ",".intercalate (fields.map fun (k, v) => quote k ++ ":" ++ Json.render v) ++ "}"

/-- One application of a specification operation. -/
structure Row where
  /-- The application: the operation and its arguments. -/
  e : String
  /-- The operation's declaration name. -/
  a : String
  /-- `{ args, result }`. -/
  v : Json

/-- The row of `op` applied to `args`, with the result the specification computes. -/
def row (op : Lean.Name) (args : List Json) (result : Json) : Row where
  e := s!"{op}({",".intercalate (args.map Json.render)})"
  a := op.toString
  v := .obj [("args", .arr args), ("result", result)]

/-- The row as one JSONL line, read off the specification revision `t`. -/
def Row.render (t : String) (r : Row) : String :=
  Json.render (.obj [("$schema", .str "lean-system/conformance/golden-vector"),
    ("e", .str r.e), ("a", .str r.a), ("v", r.v), ("t", .str t)])

end ObsmetrologiaConformance
