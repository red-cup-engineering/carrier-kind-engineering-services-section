(fn [client _]
  (client:message
   (.. (length client.server.clients)
       " client(s) connected.")))
