(local editor (require :polywell))
(local completion (require :polywell.completion))
(local draw (require :draw))

(set ship.scale 3.5)
(set ship.focused 1)

(fn focus [n]
  (let [sorted (lume.sort bodies :r)]
    (set ship.focused (+ (% (+ (- ship.focused 1) n) (# bodies)) 1))))

(fn editor.cmd.select []
  (fn select [target-name]
    (each [i b (ipairs bodies)]
      (when (= target-name b.name)
        (set ship.focused i))))
  (editor.read-line "Target: " select
                    {:completer (partial completion.for
                                         (lume.map bodies :name))}))

(fn editor.cmd.flight [] (editor.change-buffer "*flight*"))

{:name "flight"
 :parent "base"
 :map {"[" (partial focus -1)
       "]" (partial focus 1)
       "space" editor.cmd.select
       ;; "return" (fn [] (editor.cmd.connect ( . systemnames ship.focused)))
       "f4" #(let [lock (ship.toggle-lock)]
               (realprint lock)
               ;; echo does nothing???
               (editor.echo lock))}
 :props {:draw draw.flight
         :update (fn [dt]
                   (nav (keyboard.isDown "left")
                        (keyboard.isDown "right")
                        (keyboard.isDown "up")
                        (keyboard.isDown "down"))
                   (when (and (keyboard.isDown "=") (< ship.scale 64))
                     (set ship.scale (* ship.scale (- 1 (/ dt 8)))))
                   (when (and (keyboard.isDown "-") (> ship.scale 0.002))
                     (set ship.scale (* ship.scale (+ 1 (/ dt 8)))))
                   (set ship.scale (-> ship.scale
                                       (math.min 5.2)
                                       (math.max 2.3))))
         :no-file true :no-text true :unkillable true}}
