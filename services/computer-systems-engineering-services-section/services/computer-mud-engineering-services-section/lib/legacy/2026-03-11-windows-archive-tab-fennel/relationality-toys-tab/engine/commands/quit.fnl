(fn [client _]
  (client:message "Quitting now.")
  (client.server.dimension.timer:schedule
   (partial client.server.disconnect-client client.server client)))
