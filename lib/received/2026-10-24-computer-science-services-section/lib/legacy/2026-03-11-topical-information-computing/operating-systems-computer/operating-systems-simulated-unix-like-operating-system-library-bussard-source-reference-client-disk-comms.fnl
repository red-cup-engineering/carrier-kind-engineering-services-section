(editor.add-mode (require :line))

(local text-color [1 1 1])
(local nick-colors {})

(fn nick-color [nick]
  (or (. nick-colors nick)
      (let [hash (data.hash "sha1" nick)
            color (lume.map [1 2 3] #(string.byte (: hash :sub $1)))]
        (tset nick-colors nick color)
        color)))

(fn send [input]
  (when (not= input "")
    (ship.status.comm.out:push {:content input :to "broadcast"})))

(local max-comms 128)

(fn format [{: from : content}] (: "%s: %s" :format from content))

(fn deliver []
  (let [msg (ship.status.comm.in:pop)
        buf (editor.current-buffer-name)]
    (when msg
      (editor.with-output-to buf (partial editor.print (format msg)))
      (editor.print-prompt)))
  (coroutine.yield)
  (deliver))

(fn colorize [_ colors lines]
  (fn colorize-line [line]
    (if (line:find ": ")
        (let [colon (line:find ": ")
              from (line:sub 1 (- colon 1))
              content (line:sub (+ colon 2))]
          [(nick-color from) from ": " colors.text content])
        line))
  (lume.map lines colorize-line))

(fn editor.cmd.comms [] (editor.open "*comms*" "comms" true))

{:name "comms"
 :parent "line"
 :map {:return (editor.handle-input-with send)}
 :props {:activate (fn []
                     (editor.set-prompt "> ")
                     (editor.print-prompt)
                     (editor.start deliver))
         :colorize colorize
         :on-change (partial editor.colorize {})}}
