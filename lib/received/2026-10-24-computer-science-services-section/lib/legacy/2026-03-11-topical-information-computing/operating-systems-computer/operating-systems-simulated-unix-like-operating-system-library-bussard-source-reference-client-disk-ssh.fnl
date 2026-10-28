(local lume (require :lume))

(fn send []
  (let [input (lume.trim (editor.get-input))
        send (editor.get-prop :connection)]
    (when (and input send)
      (send input)
      (editor.cmd.newline 2)
      (editor.print-prompt)
      (editor.cmd.end-of-buffer)
      (editor.cmd.no-mark))
    (when (not send)
      (print "Not connected."))))

(fn disconnect []
  (let [send (editor.get-prop :connection)]
    (send "logout")
    (editor.kill-buffer)))

(fn editor.cmd.connect [target-name]
  (fn handle [username password]
    (if password
        (let [buffer-name (: "*ssh %s*" :format (hostname target-name))]
          (editor.set-prop :last-buffer (editor.current-buffer-name))
          (editor.open buffer-name "ssh" {:no-file true})
          (let [write (partial editor.write-to (editor.current-buffer-name))
                close (partial editor.kill-buffer buffer-name)
                connection (connect target-name username password write close)]
            (editor.set-prop :connection connection)))
        (editor.read-line "Password: " (partial handle (if (= username "")
                                                           "guest"
                                                           username)))))
  (editor.read-line "Username (default guest): " handle))

{:name "ssh"
 :parent "repl"
 :map {"return" send}
 :ctrl {"m" send
        "d" (fn ctrl-d []
              (let [(_ line) (editor.point)]
                (if (and (= line (editor.get-max-line))
                         (= (editor.get-input) ""))
                    (disconnect)
                    (editor.cmd.delete-forwards))))}}
