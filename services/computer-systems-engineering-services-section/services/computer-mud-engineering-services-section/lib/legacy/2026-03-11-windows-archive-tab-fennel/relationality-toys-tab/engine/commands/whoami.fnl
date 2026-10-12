(fn [client _]
  (client:message (.. "You are " (or client.name :unknown) ".")))
