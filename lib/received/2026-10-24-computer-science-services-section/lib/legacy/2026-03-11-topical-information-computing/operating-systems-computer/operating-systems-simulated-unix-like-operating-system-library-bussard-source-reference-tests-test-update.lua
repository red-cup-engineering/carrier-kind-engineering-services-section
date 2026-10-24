local t = require("lunatest")
local ship = require("ship")
local body = require("body")

local test_engine_uses_fuel_and_charges = function()
   ship.api.editor.change_buffer("*flight*")
   local down, updaters = love.keyboard.isDown, ship.updaters
   love.keyboard.isDown, ship.updaters = function(x) return(x == "up") end, {}
   ship.fuel, ship.battery = 12, ship.battery_capacity / 2
   ship:update(1)
   t.assert_lt(12, ship.fuel)
   t.assert_gt(ship.battery_capacity / 2, ship.battery)
   love.keyboard.isDown, ship.updaters = down, updaters
end

return {test_engine_uses_fuel_and_charges=test_engine_uses_fuel_and_charges}
