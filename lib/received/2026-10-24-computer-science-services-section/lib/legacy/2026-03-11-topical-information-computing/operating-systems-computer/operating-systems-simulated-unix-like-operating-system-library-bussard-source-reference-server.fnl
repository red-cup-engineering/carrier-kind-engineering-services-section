(local fennel (require :fennel))
(local lume (require :lume))
(local sock (require :lib.sock))

(local autopilot (require :autopilot))
(local orbit (require :orbit))
(local grav (require :grav))
(local os-client (require :os.client))
(local systems (require :data.systems))

(fn serializable-body [b]
  (lume.pick b :x :y :theta :name :image_name :r :mass :star :tilt :orbiting
             :p :precession :tilt :ecc))

(fn new-ship [bodies client name]
  (let [around (or (lume.match bodies :start) (. bodies 2))]
    (doto {: client : name :heading 0 :mass 16 :update-tick 0}
      (grav.set_orbit around 25))))

(fn join-ship [socket bodies ships comms data client]
  (let [existing-ship (lume.match ships (fn [s] (= s.name data.name)))
        ship (or existing-ship (new-ship bodies client data.name))]
    (set ship.client client)
    (client:send :init {:bodies (lume.map bodies serializable-body)
                        :ship (lume.pick ship :x :y :dx :dy :heading :mass)
                        :comms comms
                        :time (love.timer.getTime)})
    (when (not existing-ship)
      (table.insert ships ship))))

(fn disconnect [bodies ships data client]
  (let [ship (lume.match ships #(= $1.client client))]
    (when ship
      (info (.. "Player disconnected: " ship.name))
      (autopilot.takeover ship (lume.randomchoice (lume.filter bodies :os))))))

(fn update-ship [ships data client]
  (let [ship (lume.match ships #(= $1.client client))]
    (each [k v (pairs data)]
      (tset ship k v))))

(local max-comms 128)

(fn comm [socket ships comms data client]
  (let [from (lume.match ships #(= $1.client client))]
    (set data.from from.name))
  (table.insert comms data)
  (when (< max-comms (# comms))
    (table.remove comms 1))
  (if (= data.to "broadcast")
      (socket:sendToAll :comm data)
      (let [ship (lume.match ships #(= $1.name data.to))]
        (when (and ship ship.client)
          (ship.client:send :comm data)))))

(fn start-os [body]
  (let [hostname (-> body.name (: :lower) (: :gsub " " "-"))]
    (when (and body.os (not body.thread))
      (lume.extend body {:input (love.thread.newChannel)
                         :output (love.thread.newChannel)
                         :thread (love.thread.newThread "os/server.lua")})
      (body.thread:start body.input body.output body.os hostname {}))))

(fn init [host port system-name]
  (let [system (. systems system-name)
        ships [] comms [{:to :broadcast :from "admin"
                         :content (.. "Welcome to " system-name)}]
        socket (sock.newServer host port)]
    (socket:on :connect #(print :connect))
    (socket:on :join (partial join-ship socket system.bodies ships comms))
    (socket:on :update (partial update-ship ships))
    (socket:on :comm (partial comm socket ships comms))
    (socket:on :disconnect (partial disconnect system.bodies ships))
    (print "Server started" port)
    (orbit.init system.bodies)
    (lume.map system.bodies start-os)
    {:socket socket :ships ships :system system :comms comms}))

(fn update-players [socket ships]
  (let [positions (lume.map ships #(lume.pick $1 :name :x :y :dx :dy :heading
                                              :mass :engine-on))]
    (socket:setSendMode :unreliable)
    (socket:sendToAll :positions positions)))

(local timestep 0.01)
(var elapsed 0)

(fn update [server dt]
  (set elapsed (+ elapsed dt))
  (while (< timestep elapsed)
    (set elapsed (- elapsed dt))
    (grav.update server.system.bodies server.ships elapsed)
    (orbit.update server.system.bodies (love.timer.getTime))
    (autopilot.update server.system.bodies server.ships elapsed)
    (update-players server.socket server.ships)
    (each [_ b (pairs server.system.bodies)]
      (when b.update (b:update)))
    (server.socket:update)
    ;; (os-client.update server.system server.ships elapsed)
    ))

{: init : update}
