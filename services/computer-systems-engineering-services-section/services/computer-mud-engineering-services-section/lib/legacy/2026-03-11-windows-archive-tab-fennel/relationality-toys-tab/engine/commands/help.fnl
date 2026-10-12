(fn [client input]
  (match input
    (where (or "" nil))
    (client:message
     (.. "You are a client in a TAB world. Type commands and press ENTER.\n"
         "`commands` shows available commands. `help list` for help topics."))
    "list"
    (client:message "Help topics: mud, tab")
    "mud"
    (client:message
     "'MUD' stands for Multi-User Dimension: a server where clients connect and interact via text.")
    "tab"
    (client:message
     "TAB stands for Things with Attributes and Behaviors — the engine running this world.")
    _ (client:message "No help for that topic.")))
