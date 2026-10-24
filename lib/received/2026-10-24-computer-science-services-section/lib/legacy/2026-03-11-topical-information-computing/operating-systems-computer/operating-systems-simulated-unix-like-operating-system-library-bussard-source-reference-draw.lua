local lume = require("lume")
local starfield = require("starfield")
local planet = require("draw_planet")
local hud = require("hud")

local function setColorI(r,g,b,a)
   if(type(r) == "table") then
      love.graphics.setColor(r[1]/255, r[2]/255, r[3]/255, (r[4] or 255)/255)
   else
      love.graphics.setColor(r/255, g/255, b/255, (a or 255)/255)
   end
end

if love.graphics then love.graphics.setColorI = setColorI end

local stars = { starfield.new(7, 0.01, 100),
                starfield.new(18, 0.03, 125),
                starfield.new(10, 0.05, 175),
                starfield.new(15, 0.1, 225), }

local draw_image = function(body, img, ox, oy)
   local scale = body.star and 16 or 8
   love.graphics.draw(img, body.x, body.y,
                      body.rotation, scale, scale, ox, oy)
end

local drawers = {}

local draw_body = function(bodies, body)
   if(not drawers[body]) then
      if(body.texture_type) then
         drawers[body] = lume.fn(planet.draw, planet.random(body))
      elseif(body.texture_name) then
         drawers[body] = lume.fn(planet.draw, planet.make(body))
      elseif(body.image_name) then
         local img = love.graphics.newImage("assets/" .. body.image_name)
         drawers[body] = lume.fn(draw_image, body, img,
                                 img:getWidth() / 2, img:getHeight() / 2)
         return true
      else
         error("No way to draw " .. body.name)
      end
   end
   hud.orbit(bodies, body, {0,255,127,20})
   -- hud.aoi(bodies, body)
   love.graphics.setColor(1,1,1)
   drawers[body]()
end

local draw = function(bodies, ships, scale, focus, overlay)
   local w,h = love.window.getMode()
   local target = (focus[2] and ships[focus[1]]) or
      (not focus[2] and bodies[focus[1]]) or bodies[1]
   if not target then return end

   for _,s in pairs(stars) do starfield.render(s, target.x, target.y, w, h) end

   love.graphics.push()
   love.graphics.translate(w/2, h/2)

   love.graphics.push()
   love.graphics.scale(math.pow(2/scale, 8))
   love.graphics.setColorI(255, 255, 255)
   love.graphics.push()
   love.graphics.translate(-target.x, -target.y)
   for _,b in pairs(bodies) do
      -- if we load all the images in a single tick, it breaks our networking
      -- and we get the dreaded useless enet "Error during service" message
      if draw_body(bodies, b) then break end
   end
   if overlay then overlay() end
   love.graphics.pop()

   love.graphics.pop()

   for _, ship in ipairs(ships) do
      love.graphics.push()
      love.graphics.scale(math.pow(2/scale, 8))
      love.graphics.translate(ship.x - target.x, ship.y - target.y)
      love.graphics.setColorI(255, 50, 50);
      love.graphics.rotate(math.pi - ship.heading)
      love.graphics.scale(math.pow(scale/2, 8))
      love.graphics.polygon("fill", 0, -6, -4, 10, 4, 10)
      if(ship["engine-on"]) then
         love.graphics.setColorI(255, 255, 255);
         love.graphics.setLineWidth(1)
         love.graphics.line(-4, 11, 4, 11)
      end
      love.graphics.setLineWidth(target == ship and 5 or 1)
      hud.orbit(bodies, ship, {0,127,255,40})
      love.graphics.pop()
   end
   love.graphics.pop()
   love.graphics.setColor(1,1,1)
   love.graphics.print(("%s: %0.2f %0.2f"):format(target.name, target.x, target.y))
end

return {draw=draw}
