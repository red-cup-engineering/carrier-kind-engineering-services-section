local t = require("lunatest")

local ship = require("ship")
local editor = ship.api.editor

local map_src = [===[
ship.map = { x=0, y=0 }

map_pan = function(x, y)
   ship.map.x, ship.map.y = ship.map.x + x, ship.map.y + y
end

define_mode('map', nil, {read_only=true, draw=ship.actions.map})
bind('map', 'escape', ship.editor.close)
bind('map', 'down', lume.fn(map_pan, 0, -0.1))
bind('map', 'up', lume.fn(map_pan, 0, 0.1))
bind('map', 'left', lume.fn(map_pan, -0.1, 0))
bind('map', 'right', lume.fn(map_pan, 0.1, 0))

map = function()
   ship.editor.open(nil, '*map*')
   ship.editor.activate_mode('map')
end]===]

local function test_map()
   assert(ship.sandbox.loadstring(map_src))()
   assert(ship.sandbox.loadstring("map()"))()

   t.assert_equal("map", editor.current_mode_name())
   editor.keypressed("up")
   editor.keypressed("up")
   editor.keypressed("left")
   editor.keypressed("escape")
   t.assert_not_equal("map", editor.current_mode_name())
end

return {test_map=test_map}
