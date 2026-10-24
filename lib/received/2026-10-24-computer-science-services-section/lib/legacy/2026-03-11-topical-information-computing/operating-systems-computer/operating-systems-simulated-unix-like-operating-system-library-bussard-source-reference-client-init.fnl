;; this file sets up the environment/sandbox for the ship's onboard computer

(local lume (require :polywell.lib.lume))
(local fennel (require :polywell.lib.fennel))
(local sock (require :lib.sock))

(local editor (require :polywell))
(local completion (require :polywell.completion))

(local draw (require :draw))
(local orbit (require :orbit))
(local grav (require :grav))

(local fs (require :client.fs))
(local nav (require :client.nav))
(local remote (require :client.remote))
(local handlers (require :client.handlers))

(local safe-globals [:assert :error :next :pcall :xpcall
                     :select :tonumber :tostring :type :unpack
                     :coroutine :math :table :string])

(fn add-star [stars count factor]
  (for [_ 1 count]
    (table.insert stars {:x (math.random 16384)
                         :y (math.random 16384)
                         :factor factor})))

(local env {:package {:loaded {:polywell editor
                               :polywell.completion (require :polywell.completion)
                               :lume lume
                               :utf8 (require :polywell.lib.utf8)}}
            ;; the repl's implementation of cross-chunk local saving needs this
            :debug {:getlocal (fn getlocal [level local-num]
                                (if (= level 1)
                                    (debug.getlocal 1 local-num)
                                    (error "Disallowed!")))}
            :editor editor
            :print editor.print
            :pp (fn [x] (editor.print (fennel.view x)))
            :rpp (fn [x] (print (fennel.view x)))
            :realprint print

            :lume lume
            :graphics (or love.graphics {})
            :keyboard love.keyboard
            :data love.data
            :image (fn [name] (love.graphics.newImage (.. "assets/" name)))
            :draw draw

            ;; will be populated on connect
            :ships [] :ship {} :bodies [] :nav false
            :stars []
            :hostname remote.hostname
            :fs fs
            :connect remote.connect

            :pairs pairs
            :ipairs ipairs})

(set env._G env)

(each [_ g (ipairs safe-globals)]
  (tset env g (. _G g)))

(fn env.loadstring [code chunkname]
  (let [(chunk err) (loadstring code chunkname)]
    (if chunk
        (doto chunk (setfenv env))
        (values chunk err))))

(fn env-options [options]
  (let [options (or options {})]
    (set options.env (or options.env env))
    options))

(set env.fennel
     {:eval (fn eval [str options ...]
              (fennel.eval str (env-options options) ...))
      :repl (fn repl [options]
              (fennel.repl (env-options options)))
      :dofile (fn dofile [filename options]
                (let [source (fs.read filename)
                      options (or options {:filename filename})]
                  (env.fennel.eval source (env-options options))))
      :compileString (fn [str options ...]
                       (fennel.compileString str (env-options options) ...))
      :view fennel.view
      :version fennel.version
      :metadata fennel.metadata})

(set env.package.loaded.fennel env.fennel)
(tset env.package.loaded :polywell.lib.fennel env.fennel)

(set env.package.loaded.fennel env.fennel)

(λ env.require [module]
  (or (. env.package.loaded module)
      (let [path (: module :gsub "%." "/")
            fnl-code? (= :file (fs.type (.. path ".fnl")))
            lua-code (fs.read (.. path ".lua"))
            value (if fnl-code?
                      (env.fennel.dofile (.. path ".fnl") {:correlate true})
                      lua-code
                      (let [chunk (assert (env.loadstring lua-code path)
                                          (.. "Could not load " module))]
                        (chunk))
                      (error (.. "Module " module " not found")))]
        (tset env.package.loaded module value)
        value)))

(λ env.reload [module]
  (if (: module :find "^/") ; allow reloading kernel modules too
      (lume.hotswap (: module :sub 2))
      (let [old (assert (. env.package.loaded module) (.. "No module: " module))
            _ (tset env.package.loaded module nil)
            (ok new) (pcall env.require module)
            new (if (not ok) (do (print new) old) new)]
        (when (= (type new) :table)
          ;; TODO: save off old values; recover if there's an error
          (each [k v (pairs new)]
            (tset old k v))
          (each [k (pairs old)]
            (when (not (. new k))
              (tset old k nil)))
          (tset env.package.loaded module old)))))

(fn editor.cmd.reload []
  (editor.read-line "module: " env.reload
                    {:completer (partial completion.for
                                         (lume.keys env.package.loaded))}))

(var tick 0)

(fn update [client system ship dt]
  (let [msg (ship.comm.out:pop)]
    (when msg
      (client:send :comm msg)))
  (set tick (+ tick dt))
  (when (< 0.2 tick)
    (set tick 0)
    (client:send :update (lume.pick ship :x :y :dx :dy :heading :engine-on)))
  (when system.bodies
    (orbit.update system.bodies (- (love.timer.getTime) system.time-offset))
    (grav.update system.bodies [ship] dt))
  (coroutine.yield)
  (update client system ship dt))

(fn connect [host port system ship name]
  (let [client (sock.newClient host port)]
    (info (.. "Connecting to " host " on " port))
    (client:on :connect (fn [data]
                          (info "Connected" (.. host ":" port))
                          (client:send :join {:name name})
                          (editor.start (partial update client system ship))))
    (client:on :init (partial handlers.init system ship))
    (client:on :positions (partial handlers.positions system ship))
    (client:on :comm (partial handlers.comm system ship))
    (client:on :disconnect #(do (print :disconnect)
                                (love.event.quit)))
    (client:connect)
    (editor.start (fn updater []
                    (client:update)
                    (coroutine.yield)
                    (updater)))))

(fn init [host port name]
  (let [ship {:name name :x 0 :y 0 :dx 0 :dy 0 :heading 0 :mass 16
              :comm {:in (love.thread.newChannel) :out (love.thread.newChannel)}
              :engine-strength (* 5120 2) :turn-speed 1}
        system {:env env}]
    (doto env.stars
      (add-star 7 0.1)
      (add-star 18 0.3)
      (add-star 10 0.5)
      (add-star 15 1))
    (set _G.ship ship) (set _G.s system) ; for repl use
    (set env.nav (partial nav.env ship))
    (set env.ship.toggle-lock #(grav.toggle-lock system.bodies ship
                                                 env.ship.focused))
    (orbit.init system ship)
    (nav.init ship)
    ;; (remote.init system)
    (env.require "init")
    (editor.init "*repl*" "repl"
                 ["This is the repl. Enter code to run." ">> "] fs)
    (connect host port system ship name)
    (when (not (os.getenv "NOFLIGHT"))
      (editor.open "*flight*" "flight" {:no-file true}))))

{: init}
