(local editor (require :polywell))

(local keywords ["and" "break" "do" "else" "elseif" "end" "false"
                  "for" "function" "if" "in" "local" "nil" "not" "or"
                  "repeat" "return" "then" "true" "until" "while"])

(set keywords.comment_pattern "[-][-]")

{:name "lua"
 :parent "edit"
 :activate-patterns [".*lua$"]
 :props {:on-change (partial editor.colorize keywords)
         :activate (partial editor.colorize keywords)}
 :map {"tab" editor.complete}
 :alt {"/" editor.complete}}
