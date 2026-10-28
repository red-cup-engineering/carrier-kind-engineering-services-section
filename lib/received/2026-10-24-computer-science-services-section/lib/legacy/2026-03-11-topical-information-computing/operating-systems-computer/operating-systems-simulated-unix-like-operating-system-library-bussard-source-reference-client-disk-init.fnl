(editor.add-mode {:name "base"
                  :ctrl {"x" {:ctrl {"f" editor.cmd.find-file
                                     "c" editor.cmd.quit
                                     "l" editor.cmd.reload}
                              :map {"1" editor.cmd.split
                                    "2" (partial editor.cmd.split "vertical")
                                    "3" (partial editor.cmd.split "horizontal")
                                    "4" (partial editor.cmd.split "triple")
                                    "b" editor.cmd.switch-buffer
                                    "k" editor.cmd.close
                                    "o" editor.cmd.focus-next}}
                         "o" editor.cmd.find-file
                         "q" editor.cmd.quit
                         "pageup" editor.cmd.prev-buffer
                         "pagedown" editor.cmd.next-buffer}
                  :alt {"x" editor.cmd.execute
                        "return" editor.cmd.toggle-fullscreen}
                  :ctrl-alt {"b" editor.cmd.switch-buffer
                             "x" editor.cmd.execute}})

(editor.add-mode (require :help-mode))
(editor.add-mode (require :edit-mode))
(editor.add-mode (require :fennel-mode))
(editor.add-mode (require :lua-mode))
(editor.add-mode (require :repl))
(editor.add-mode (require :comms))

(editor.add-mode (require :flight))
;; (set ship.main-modes [:help :flight :inbox :browse :repl])
;; (each [key command (pairs ship.main-modes)]
;;   (editor.define-key "base" :map (.. :f key) (. editor.cmd command)))
