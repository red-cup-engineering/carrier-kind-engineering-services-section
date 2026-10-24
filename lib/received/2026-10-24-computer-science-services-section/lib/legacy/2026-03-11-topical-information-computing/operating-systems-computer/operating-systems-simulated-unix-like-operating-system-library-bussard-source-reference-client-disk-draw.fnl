(local editor (require :polywell))

(fn draw-stars [stars x y w h]
  (each [_ star (ipairs stars)]
    (graphics.circle :fill (% (- star.x (* x star.factor 5)) w)
                     (% (- star.y (* y star.factor)) h) 1)))

(fn draw-stencil-img [img x y w h tilt radius frame]
  (graphics.stencil (partial graphics.circle "fill" x y radius))
  (graphics.setStencilTest "greater" 0)
  (let [bscale (/ (* radius 2) h)]
    (graphics.draw img x y tilt bscale bscale
                   (+ (/ w 2) (% frame w)) (/ h 2))
    (graphics.draw img x y tilt bscale bscale
                   (- (% frame w) (/ w 2)) (/ h 2)))
  (graphics.setStencilTest)
  (graphics.setColor 1 1 1))

(local imgs {})

(fn load-image [name]
  (or (. imgs name)
      (let [img (image name)]
        (tset imgs name [img (: img :getDimensions)])
        (. imgs name))))

(fn draw-body [body frame]
  (let [[img w h] (load-image body.image_name)
        radius (if body.star
                   (/ body.mass 42)
                   (* body.mass 22))]
    ;; for rectangular rotating images
    (draw-stencil-img img body.x body.y w h body.tilt radius frame)))

(fn draw-ship [ship]
  (graphics.setColor 1 0.2 0.2)
  (graphics.rotate (- math.pi ship.status.heading))
  (graphics.scale 16 16)
  (graphics.polygon "fill" 0 -0.4 -0.3 1 0.3 1)
  (when ship.status.thrust?
    (graphics.setColor 1 1 1)
    (graphics.line -0.3 1 0.3 1)))

(fn polar->xy [r theta]
  (values (* (math.cos (* theta -1)) r) (* (math.sin (* theta -1)) r)))

(fn trajectory [body]
  ;; assume ellipse for now; handle parabola/hyperbola later
  ;; (let [orbiting (. system body.orbiting)]
  ;;   (fn trajectory-step [theta last-x last-y]
  ;;     (let [r (/ body.p (+ 1 (* (or body.ecc 0) (math.cos theta))))
  ;;           (rx ry) (polar->xy r (+ body.precession theta))
  ;;           next-x (+ orbiting.x rx)
  ;;           next-y (+ orbiting.y ry)]
  ;;       (when last-x
  ;;         (graphics.line last-x last-y next-x next-y))
  ;;       (when (< theta math.pi)
  ;;         (trajectory-step (+ theta 0.01) next-x next-y))))
  ;;   (trajectory-step (- math.pi)))
  )

(fn draw-hud [ship target w h]
  (graphics.setColor 1 1 1)
  (when ship.target
    (let [distance (lume.distance ship.status.x ship.status.y target.x target.y)]
      (graphics.print target.name 10 10)
      (graphics.print (: "%0.2f" :format distance) 10 20)))
  (graphics.setColor 0 (/ 200 255) 0)
  ;; (for [i 1 5]
  ;;   (graphics.rectangle :line )
  ;;   (graphics.print (.. :f i " " (. ship.main-modes i)) (* i 32) (- h 20)))
  )

(fn flight [background?]
  (let [target (. bodies ship.focused)]
    (draw.draw bodies (doto (lume.clone ships)
                        (table.insert 1 ship.status))
               ship.scale [1 true]
               #(when (and ship.x ship.y target)
                  (realprint :target target.name)
                  (graphics.setColor 0 1 0.3)
                  (graphics.line ship.x ship.y target.x target.y)))
    (when target (graphics.print target.name 5 15))))

{:flight flight}
