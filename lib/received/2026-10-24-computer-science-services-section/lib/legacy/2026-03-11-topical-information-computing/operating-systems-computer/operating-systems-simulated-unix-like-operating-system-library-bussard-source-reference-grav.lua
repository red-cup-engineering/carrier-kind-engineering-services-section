local utils = require("utils")

local g = 4196
local lock_range = 2048 * 15

-- Without capping gravity accel, you run into a weird bug caused by
-- the fact that we calculate gravitation discretely instead of
-- continuously. If the point of calculation is one at which you are very close
-- to a star, you'll be given a very high velocity, and the next point of
-- calculation won't happen till you're further away, so gravity won't get
-- a chance to slow you back down. This is only noticeable when you pass over
-- what is essentially the heart of a star, but it's very annoying when you do.

local max_accel = 100

-- return the acceleration felt at (x,y) due to body
local g_accel = function(body, x, y)
   if(body.mass == 0) then return 0, 0 end
   -- a vector that points from (x,y) to the body
   local dx, dy = (body.x - x), (body.y - y)
   local distance = utils.distance(dx, dy)

   -- the same vector but with unit length
   local nx = dx / distance
   local ny = dy / distance

   local accel = math.min((body.mass * g) / (distance * distance), max_accel)
   return (accel * nx), (accel * ny)
end

local is_gravitated_by = function(from, to)
   if(from == to) then return false
   elseif(to.star) then return false
   elseif((to.world or to.portal) and not from.star) then return false
   else return true end
end

local gravitate = function(bodies, s, dt)
   s.x = s.x + (s.dx * dt)
   s.y = s.y + (s.dy * dt)

   for _, b in ipairs(bodies) do
      if(is_gravitated_by(b, s)) then
         local ddx2, ddy2 = g_accel(b, s.x, s.y)
         s.dx = s.dx + (dt * ddx2)
         s.dy = s.dy + (dt * ddy2)
      end
   end
end

local dx, dy

local orbital_lock = function(bodies, ship, to_name)
   if to_name == nil then return end
   local to = utils.find_by(bodies, "name", to_name)
   if(not to) then ship.locked_to = nil return end
   ship.heading = math.atan2(to.x - ship.x, to.y - ship.y)
   ship.x, ship.y = to.x + (dx or 1000), to.y + (dy or 1000)
   return true
end

local set_orbit = function(b, around, r, theta)
   if(b.star) then
      b.x, b.y = 0, 0
   elseif(b.r or r or (b.x and b.y)) then
      b.r = r or b.r or utils.distance(b.x, b.y)
      theta = theta or love.math.random() * math.pi * 2
      local v = math.sqrt((g*around.mass)/b.r)

      b.x = around.x + math.sin(theta) * b.r
      b.y = around.y + math.cos(theta) * b.r
      b.dx = around.dx + math.sin(theta + math.pi / 2) * v
      b.dy = around.dy + math.cos(theta + math.pi / 2) * v
   end
end

return {
   update = function(bodies, ships, dt)
      for _,s in pairs(ships) do
         if not orbital_lock(bodies, s, s.locked_to) then
            gravitate(bodies, s, dt)
         end
      end
   end,

   init = function(bodies)
      for _, b in ipairs(bodies) do
         set_orbit(b, bodies[1], b.r)
      end
   end,

   ["toggle-lock"] = function(bodies, ship, focused)
      local target = bodies[focused]
      local distance = target and utils.distance(ship, target)
      if(ship.locked_to) then
         ship.locked_to = nil
         return "Orbital lock disengaged."
      elseif(target == nil) then
         return "Cannot lock without target."
      elseif(distance > lock_range) then
         return "Orbital lock out of range: " .. distance
      else
         ship.locked_to = target.name
         dx, dy = ship.x - target.x, ship.y - target.y
         return "Orbital lock engaged."
      end
   end,

   set_orbit = set_orbit,

   g = g,
   max_accel = max_accel,
}
