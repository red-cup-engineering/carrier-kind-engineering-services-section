local t = require("lunatest")
local lume = require("lume")
local ship = require("ship")

local function test_range()
   ship:enter("Wolf 294", true, true)
   ship.x, ship.y = 999999, 999999
   local send = ship.sandbox.ssh_connect("guest", "")
   t.assert_false(send)
end

local function test_failed_no_target()
   ship:enter("Wolf 294", true, true)
   local solotogo = ship.bodies[2]
   ship.x, ship.y = solotogo.x, solotogo.y
   local send = ship.sandbox.ssh_connect("guest", "")
   t.assert_true(not send)
end

local function test_failed_bad_creds()
   ship:enter("Wolf 294", true, true)
   local solotogo = ship.bodies[2]
   ship.x, ship.y, ship.target = solotogo.x, solotogo.y, solotogo
   local send = ship.sandbox.ssh_connect("guest", "12345")
   t.assert_true(not send)
end

local function test_guest_login()
   local rs = ssh_run("Wolf 294", "Solotogo", "guest", "", "echo hi", 1)
   t.assert_equal("stdout", rs[1].op)
   t.assert_equal("hi\n", rs[1].out)
end

local function test_rover_login()
   local rs = ssh_run("Wolf 294", "Solotogo",
                      "nim02", "mendaciouspolyglottal",
                      "16 32 + .s", 4)
   assert_teq({"rpc", "rpc", "stdout", "stdout"}, lume.map(rs, "op"))
   t.assert_equal("48\n", rs[3].out)
   t.assert_equal("ok\n", rs[4].out)
end

return {test_range = test_range, test_guest_login = test_guest_login,
        test_failed_no_target = test_failed_no_target,
        test_failed_bad_creds = test_failed_bad_creds,
        test_rover_login = test_rover_login}
