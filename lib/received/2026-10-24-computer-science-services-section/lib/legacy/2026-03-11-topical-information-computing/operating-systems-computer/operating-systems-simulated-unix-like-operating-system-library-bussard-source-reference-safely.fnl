(local lume (require :lume))

(fn restore [state]
  (state.restore)
  (set love.draw state.draw)
  (set love.keypressed state.keypressed)
  (set love.update state.update))

(fn draw [err]
  (love.graphics.setColor 0.3 0.6 0.9)
  (love.graphics.rectangle :fill 0 0 (love.graphics.getDimensions))
  (love.graphics.setColor 1 1 1)
  (love.graphics.print (.. "Error: " err) 60 100)
  (love.graphics.print "Press space to reload the module and continue." 100 130)
  (love.graphics.print "Press escape to quit." 100 150))

(fn keypressed [state key]
  (match key
    "space" (restore state)
    "escape" (love.event.quit)))

(fn [mod-name fname args]
  (var f nil)
  (let [state {:restore #(do (lume.hotswap mod-name)
                             (set f (. (require mod-name) fname)))}]
    (state.restore)
    (fn [...]
      (when (= :reload ...) (state.restore))
      (let [(ok? err) (pcall f args ...)]
        (when (not ok?)
          (print err)
          (set state.draw love.draw)
          (set state.keypressed love.keypressed)
          (set state.update love.update)
          (set love.draw (partial draw err))
          (set love.keypressed (partial keypressed state))
          (set love.update (fn [] nil)))))))
