(local lume (require :lib.lume))

(local g 6.67408)
(local scale 32)
(local tau (* math.pi 2))

(λ find-body [bodies body-name]
  (lume.match bodies #(= $1.name body-name)))

(λ polar->xy [r theta]
  ;; reverse theta because y goes negative as it goes "up"
  (values (* (math.cos (* theta -1)) r) (* (math.sin (* theta -1)) r)))

(λ body-orbit-path [body orbiting time]
  (let [r (/ body.p (+ 1 (* body.ecc (math.cos body.theta))))
        (x y) (polar->xy r (+ body.precession body.theta))
        v (/ (math.sqrt (* g orbiting.mass)) r)
        new-x (+ orbiting.x x) new-y (+ orbiting.y y)]
    (set body.dx (- new-x (or body.x new-x)))
    (set body.dy (- new-y (or body.y new-y)))
    (set body.x new-x)
    (set body.y new-y)
    (set body.theta (math.fmod (* time v) tau))))

(λ update [bodies time]
  (each [_ body (pairs bodies)]
    (when body.orbiting
      (body-orbit-path body (find-body bodies body.orbiting) time))))

(λ calculate-orbital [bodies body]
  (let [ap (/ (or body.ap body.r) scale)
        peri (/ (or body.peri body.r) scale)
        a (+ ap peri) ; major axis
        ecc (/ (- ap peri) a) ; eccentricity
        b (math.sqrt (- (* a a) (* (- a peri peri) (- a peri peri))))]
    ;; orbital eccentricity
    (set body.ecc ecc)
    ;; semi-latus rectum
    (set body.p (/ (* b b) a))
    (when body.orbiting
      (set body.precession (math.fmod body.precession tau))
      (set body.period (/ (* a a a) g (. (find-body bodies body.orbiting) :mass))))))

(λ place [bodies body ?orbiting]
  (when (and ?orbiting ?orbiting.orbiting
             (not (and ?orbiting.x ?orbiting.y ?orbiting.dx ?orbiting.dy)))
    (place bodies ?orbiting (find-body bodies ?orbiting.orbiting)))
  (when (not (and body.x body.y body.dx body.dy))
    ;; apsidal precession specifically
    (set body.precession (or body.precession (* (love.math.random) tau)))
    (set body.theta (or body.theta (* (love.math.random) tau)))
    (calculate-orbital bodies body)
    (when body.orbiting
      (body-orbit-path body (find-body bodies body.orbiting)
                       (love.timer.getTime)))))

{:init (λ init [bodies]
         (each [_ body (pairs bodies)]
           (when body.orbiting
             (place bodies body (find-body bodies body.orbiting)))))
 :calculate-orbital calculate-orbital
 :scale scale
 :update update}
