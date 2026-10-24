(local lume (require :lib.lume))

(fn iterator-for [iterate raw wrap]
  (fn iterator []
    (let [t [] wrap (or wrap (fn [x] x))]
      (each [k v (iterate raw)]
        (tset t k (if (= (type v) :table) (wrap v) v)))
      (values next t nil))))

(fn read-only [source table-name]
  (fn newindex []
    (error (.. (or table-name "table") ": read only")))
  (setmetatable {} {:__index (fn [_ key]
                               (if (= (type (. source key)) :table)
                                   (read-only (. source key))
                                   (. source key)))
                    :__newindex newindex
                    :__pairs (iterator-for pairs source read-only)
                    :__ipairs (iterator-for ipairs source read-only)}))

(fn comm [system ship msg]
  (ship.comm.in:push msg))

(fn init [system ship {: bodies :ship server-ship : comms : time}]
  (set system.time-offset (- (love.timer.getTime) time))
  (set system.bodies bodies)
  (each [_ msg (ipairs comms)]
    (comm system ship msg))
  (set system.env.bodies bodies)
  (set system.env.ship.status (read-only ship :ship))
  (each [k v (pairs server-ship)]
    (tset ship k v)))

(fn positions [system ship ships]
  (each [i s in (lume.ripairs ships)]
    (when (= ship.name s.name)
      (table.remove ships i)))
  (set system.ships ships)
  (set system.env.ships ships))

(fn comm [system ship msg]
  (ship.comm.in:push msg))

{: init : positions : comm}
