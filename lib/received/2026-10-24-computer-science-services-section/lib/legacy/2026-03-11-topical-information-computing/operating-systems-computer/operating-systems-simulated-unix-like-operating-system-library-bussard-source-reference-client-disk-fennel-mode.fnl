(local editor (require :polywell))

(local keywords ["let" "set" "tset" "fn" "lambda" "λ" "require" "if" "when"
                 "do" "block" "true" "false" "nil" "values" "pack" "for" "each"
                 "local" "partial" "and" "or" "not" "special" "macro"])

(set keywords.comment_pattern ";")

{:name "fennel"
 :parent "edit"
 :activate-patterns [".*fnl$"]
 :props {:on-change (partial editor.colorize keywords)
         :activate (partial editor.colorize keywords)}}
