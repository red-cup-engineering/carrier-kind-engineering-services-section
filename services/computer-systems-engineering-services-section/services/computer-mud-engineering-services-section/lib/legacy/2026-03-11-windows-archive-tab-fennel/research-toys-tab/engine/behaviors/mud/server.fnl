;;;; MUD server behaviors

(local util (require :util))
(local socket (require :socket))

;; Forward-declare tick so start can reference it.
(var tick nil)

(fn accept-connection [server connection]
  (connection:settimeout server.timeout)
  (let [client (util.make-model
                :mud/client
                {: connection : server
                 :dimension server.dimension})]
    (table.insert server.clients client)
    (client:message
     (.. "Connected to " (server:fname) ".\n"
         (server:describe) "\n"))
    (client:parse "help")
    (when (and client.dimension client.dimension.map
               client.dimension.conf client.dimension.conf.start-area)
      (client:move
       (client.dimension.map:find-area client.dimension.conf.start-area)))
    (set client.input-ready? true)))

(fn disconnect-client [server client]
  (client:message "Disconnecting; goodbye!")
  (client.connection:close)
  (set server.clients (util.remove-value server.clients client)))

(fn ld [server dimension]
  (util.log :debug (.. "Loading " server.name))
  (set server.dimension dimension)
  (set server.loaded true)
  (util.log :debug (.. "Loaded " server.name)))

(fn start [server]
  (if server.loaded
      (let [port (or server.port 4242)]
        (util.log :debug (.. "Starting " server.name " on port " port))
        (set server.socket (assert (socket.bind "0.0.0.0" port)))
        (server.socket:settimeout (or server.timeout 0.001))
        (server.dimension.timer:schedule
         (partial tick server true))
        (util.log :info (.. "Started " server.name " on port " port)))
      (util.log :error (.. server.name " not loaded; can't start"))))

(set tick (fn [server ?repeat]
  ;; Accept new connections
  (let [new-conn (server.socket:accept)]
    (when new-conn
      (util.log :debug "Accepting new connection.")
      (accept-connection server new-conn)))
  ;; Process each client
  (each [_ client (ipairs server.clients)]
    (match (client.connection:receive)
      (_ :timeout) nil
      (_ err) (disconnect-client server client)
      input (do (client:parse input)
                (set client.input-ready? true)))
    (when (> (length client.buffer) 0)
      (client.connection:send
       (.. client.buffer
            (if client.input-ready? "\n> " "")))
      (set client.buffer "")
      (set client.input-ready? nil)))
  ;; Reschedule
  (when ?repeat
    (server.dimension.timer:schedule
     (partial tick server true)))))

{:load ld
 :accept-connection accept-connection
 :disconnect-client disconnect-client
 : start : tick}
