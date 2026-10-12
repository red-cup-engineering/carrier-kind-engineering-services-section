;;;; timer system — event queue with tick-based scheduling

(local socket (require :socket))
(local util (require :util))

(fn schedule [timer event ?delay]
  (let [delay (or ?delay 1)]
    (match (. timer.events delay)
      existing (table.insert existing event)
      _ (tset timer.events delay [event]))))

(fn tick [timer]
  (set timer.count (+ timer.count 1))
  (let [due (. timer.events 1)]
    (tset timer.events 1 nil)
    ;; Shift everything down by one tick
    (let [old (util.clone-table timer.events)]
      (each [moment events (pairs old)]
        (tset timer.events moment nil)
        (tset timer.events (- moment 1) events)))
    ;; Execute due events
    (when due
      (each [_ event (ipairs due)]
        (event)))))

(fn run [timer]
  (timer:tick)
  (socket.select nil nil (or timer.rate 0.2))
  (timer:run))

{: schedule : tick : run}
