(editor.add-mode (require :console))

(fn activate []
  (let [buf (editor.current-buffer-name)
        out (fn [xs]
              (editor.with-output-to
               buf (partial editor.print (table.concat xs " "))))
        options {:readChunk coroutine.yield
                 :onValues out
                 :onError (fn [kind ...] (out [kind "Error:" ...]))
                 :pp fennel.view
                 :useMetadata true}
        coro (coroutine.create fennel.repl)]
    (editor.set-prompt ">> ")
    (editor.print-prompt)
    (editor.set-prop :eval (doto coro (coroutine.resume options)))))

(fn eval []
  (editor.enforce-max-lines 512)
  (let [input (editor.get-input)]
    (editor.history-push input)
    (editor.cmd.end-of-line)
    (editor.cmd.newline)
    (editor.cmd.no-mark)
    (coroutine.resume (editor.get-prop :eval) (.. input "\n"))
    (editor.print-prompt)))

(fn editor.cmd.repl [] (editor.change-buffer "*repl*"))

{:name "repl"
 :parent "console"
 :map {"return" eval}
 :ctrl {"m" eval}
 :props {:activate activate
         :unkillable true}}
