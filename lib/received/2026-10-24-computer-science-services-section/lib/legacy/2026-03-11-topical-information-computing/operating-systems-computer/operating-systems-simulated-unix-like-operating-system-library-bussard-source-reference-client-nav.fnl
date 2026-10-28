(local editor (require :polywell))
(local lume (require :polywell.lib.lume))

(fn update [ship dt]
  (when ship.engine-on
    (let [fx (* (math.sin ship.heading) dt ship.engine-strength)
          fy (* (math.cos ship.heading) dt ship.engine-strength)]
      (set ship.dx (+ ship.dx (/ fx ship.mass)))
      (set ship.dy (+ ship.dy (/ fy ship.mass)))))
  (when ship.turning-left
    (set ship.heading (+ ship.heading (* dt ship.turn-speed))))
  (when ship.turning-right
    (set ship.heading (- ship.heading (* dt ship.turn-speed))))
  (update ship (coroutine.yield)))

{:init (fn [ship]
         (editor.start (partial update ship)))
 :env (fn [ship left right up _down]
        ;; save it for later; don't do the actual update till we have dt
        (set ship.engine-on up)
        (set ship.turning-left left)
        (set ship.turning-right right))}
