;;;; dimension behaviors — load, start, run a world

(local util (require :util))

(fn make-model [dimension model ?addn]
  (util.make-model model ?addn dimension))

(fn ld [dimension]
  "Load: instantiate systems, call their load methods."
  (util.log :debug (.. "Loading " (dimension:fname)))
  (each [system-name model-name (pairs dimension.systems)]
    (util.log :debug (.. "Making " system-name " system."))
    (tset dimension system-name (util.make-model model-name))
    (let [s (. dimension system-name)]
      (when s.load (s:load dimension))))
  (set dimension.loaded true)
  (util.log :info (.. "Loaded " (dimension:fname))))

(fn start [dimension]
  "Start: call start on each system."
  (if dimension.loaded
      (do (util.log :debug (.. "Starting " dimension.name))
          (each [sname _ (pairs dimension.systems)]
            (let [s (. dimension sname)]
              (when s.start (s:start))))
          (set dimension.started true)
          (util.log :info (.. "Started " dimension.name)))
      (util.log :error (.. dimension.name " not loaded; can't start"))))

(fn run [dimension]
  "Run: hand off to the timer loop."
  (if dimension.started
      (if dimension.timer
          (do (util.log :info (.. "Running " dimension.name))
              (dimension.timer:run))
          (util.log :error "No timer system."))
      (util.log :error (.. dimension.name " not started; can't run"))))

(fn lsr [dimension]
  (dimension:load)
  (dimension:start)
  (dimension:run))

{:load ld : start : run : lsr : make-model}
