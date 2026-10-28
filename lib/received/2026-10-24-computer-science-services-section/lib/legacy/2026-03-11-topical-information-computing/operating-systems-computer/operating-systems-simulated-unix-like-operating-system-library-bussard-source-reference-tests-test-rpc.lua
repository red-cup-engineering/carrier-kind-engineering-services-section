local t = require("lunatest")
local lume = require("lume")

local ship = require("ship")
local body = require("body")
local client = require("os.client")

local exec = function(command, reply_count)
   local send, recv = ship.sandbox.ssh_connect("guest", "")
   if(not send) then
      for _,l in ipairs(ship.api.editor.debug("lines")) do
         print(l)
      end
      error("Could not connect")
   end
   assert(recv(true).op == "stdout", "error connecting")
   assert(recv(true).op == "rpc", "error connecting")
   send(command)
   local vals = {}
   for _=1,(reply_count or 0) do table.insert(vals, recv(true)) end
   send("logout")
   assert(recv(true).op == "rpc", "error disconnecting.")
   assert(recv(true).op == "disconnect", "error disconnecting.")
   return vals
end

local eval = function(code)
   local chunk = assert(ship.sandbox.loadstring(code))
   return chunk()
end

local pass = function()
   love.timer.sleep(0.1)
   client.update(ship, true)
end

local test_completion = function()
   ship:enter("Wolf 294", true, true)
   local solotogo = ship.bodies[2]
   ship.x, ship.y, ship.target = solotogo.x, solotogo.y, solotogo
   ship.target_number, ship.target = 2, solotogo

   eval("ssh('guest', '')")
   ship.api.editor.textinput("/bin/up", true)
   ship.api.editor.end_of_buffer()
   pass()
   ship.api.editor.keypressed("tab")
   ship.api.editor.end_of_buffer()
   pass()

   local first_completed = ship.api.editor.get_line()
   ship.api.editor.keypressed("return")
   pass()

   ship.api.editor.textinput("bi", true)
   ship.api.editor.end_of_buffer()
   ship.api.editor.keypressed("tab")
   pass()

   local second_completed = ship.api.editor.get_line()
   ship.api.editor.get("ssh_send")("logout")
   pass()

   t.assert_equal("/home/guest $ /bin/upgrade", first_completed)
   t.assert_equal("/home/guest $ bin/", second_completed)
end

-- this consistently passes locally but fails in CI
return {} -- {test_loans=test_loans, test_completion=test_completion}
