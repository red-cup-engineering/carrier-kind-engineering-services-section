lume = require("lume")
local lunatest = require("lunatest")

local ship = require("ship")

local function flush_recv(recv)
   if(recv()) then return recv() end
end

function assert_teq(t1, t2)
   lunatest.assert_table(t1)
   lunatest.assert_table(t2)
   for k,v in pairs(t1) do
      if(type(v) == "table") then
         assert_teq(v, t2[k])
      else
         lunatest.assert_equal(v, t2[k])
      end
   end
end

move_to = function(body)
   local b = lume.match(ship.bodies, (function(b) return b.name == body end))
   lunatest.assert_table(b)
   ship.x, ship.y, ship.target = b.x, b.y, b
end

ssh_run = function(system, body, username, password, command, reply_count)
   ship:enter(system, true, true)
   move_to(body)
   local send, recv = assert(ship.sandbox.ssh_connect(username, password))
   lunatest.assert_function(send)
   lunatest.assert_function(recv)
   lunatest.assert_equal("stdout", recv(true).op, "error connecting!")
   lunatest.assert_equal("rpc", recv(true).op, "error disconnecting1")
   send(command)
   local vals = {}
   for _=1,(reply_count or 0) do table.insert(vals, recv(true)) end
   send("logout")
   local msg1 = recv(true)
   print(msg1.op, msg1.out)
   lunatest.assert_equal("rpc", msg1.op, "error disconnecting")
   local msg = recv(true)
   lunatest.assert_equal("disconnect", msg.op, "error disconnecting." .. lume.serialize(msg))
   flush_recv(recv)
   return vals
end

for _,filename in ipairs(love.filesystem.getDirectoryItems("tests")) do
   if(filename:match("^test_.*%.lua$")) then
      lunatest.suite("tests." .. filename:gsub(".lua", ""))
   end
end

lunatest.run(nil, {"--verbose"})
love.event.quit()
