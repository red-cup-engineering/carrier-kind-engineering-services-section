return {
   new_session = function(stdin, output, _username, hostname)
      local thread = love.thread.newThread("os/wrap_server.lua")
      thread:start("os/rover/session.lua",
                   nil, nil, stdin, output, hostname)
      return {}
   end,

   is_authorized = function() return true end,
   kill = function(session) session.stdin:push({op="kill"}) end,
}
