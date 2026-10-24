local lume = require("lume")
local utils = require("utils")

local find_body = function(bodies, name)
   return lume.match(bodies, function(b) return b.name == name end)
end

local names = lume.array(love.filesystem.lines("data/ships.txt"))

local normalize = function(t)
   return ((t + math.pi) % (math.pi * 2)) - math.pi
end

local stuck_dist, unstuck_dist, stuck_time_limit = 4096, 10000, 80
local speed_limit = 8192

local thrust = function(self, dt)
   local fx = (math.sin(self.heading) * dt * self.engine_strength)
   local fy = (math.cos(self.heading) * dt * self.engine_strength)
   self.dx = self.dx + fx / self.mass
   self.dy = self.dy + fy / self.mass
   self["engine-on"] = true
end

local escape_star = function(self, dt)
   local theta_f = normalize(-math.atan2(self.dy, self.dx) + math.pi/2)
   if(math.abs(theta_f - self.heading) < 1) then
      thrust(self, dt)
   end
end

-- TODO: gravitation refactor horked a lot of this up, so ships have a really
-- hard time making it to their targets now
local update = function(bodies, ship, dt)
   if(not ship.from) then ship.from = find_body(bodies, ship.from_name) end
   if(not ship.target) then ship.from = find_body(bodies, ship.target_name) end
   ship["engine-on"] = false
   local tx = ship.target.x + ship.target.dx * ship.projection
   local ty = ship.target.y + ship.target.dy * ship.projection
   local sx = ship.x + ship.dx * ship.projection
   local sy = ship.y + ship.dy * ship.projection
   local theta = normalize(-math.atan2(ty - sy, tx - sx) + math.pi/2)
   local dist = utils.distance({x=sx, y=sy}, {x=tx,y=ty})
   local star_dist = utils.distance(ship.x, ship.y)
   if(star_dist < stuck_dist) then
      ship.stuck_time = (ship.stuck_time or 0) + dt
   elseif(star_dist > unstuck_dist) then
      ship.stuck_time = 0
   end
   if(ship.stuck_time and (ship.stuck_time > stuck_time_limit)) then
      escape_star(ship, dt)
   elseif(dist > ship.target_range) then
      local theta_v = normalize(-math.atan2(ship.dy, ship.dx) + math.pi/2)
      local v = utils.distance(ship.dx, ship.dy)
      local dv = v - utils.distance(ship.target.dx, ship.target.dy)
      if(math.abs(theta_v - theta) > 1 and dv < speed_limit) then
         ship.heading = theta
         thrust(ship, dt)
      end
      ship.projection = ship.projection + 0.001
   elseif(ship.projection > 1) then
      ship.projection = ship.projection - 0.25
   else -- we've been here a while now
      if(ship.target.portal and ship.remove) then -- portal on out
         info("NPC " .. ship.name .. " left via " .. ship.target.name)
         ship:remove()
      else -- find a portal to target
         local portals = lume.filter(bodies, "portal")
         if(#portals == 0) then print(bodies[1]) end
         ship.target = portals[love.math.random(#portals)] or ship.target
         ship.target_name = ship.target.name
         ship.projection = 60
         info("NPC " .. ship.name .. " is now heading for " .. ship.target.name)
      end
   end
end

local make = function(bodies, ships, name)
   local targets = lume.filter(bodies, "os")
   local target = assert(targets[love.math.random(#targets)])

   local portals = lume.filter(bodies, "portal")
   local from = portals[love.math.random(#portals)]

   while target == from do target = targets[love.math.random(#targets)] end

   info("Spawned NPC " .. name .. " headed for " .. target.name)
   return {
      npc = true,
      name = name,

      x = from.x, y = from.y, dx=0, dy=0, heading = 0,
      mass = love.math.randomNormal(16, 42),

      engine_strength = 5120,
      projection = 60,
      target_range = 1000,

      target = target, target_name = target.name,
      from = from, from_name = from.name,
      remove = lume.fn(lume.remove, ships)
   }
end

local insert_new = function(bodies, ships, from_portal)
   local s = make(bodies, ships, names[love.math.random(#names)], from_portal)
   table.insert(ships, s)
end

local sys_pop = function(bodies)
   return lume.reduce(bodies, function(p, b) return p + (b.pop or 0) end, 0)
end

local update_counter = 0

-- for every 1 population in a system, there should be this many npcs:
local npc_factor = 1

local npc_spawn_period = 160

return {
   update = function(bodies, ships, dt, force_spawn)
      if(update_counter < npc_spawn_period and not force_spawn) then
         update_counter = update_counter + dt
      else
         update_counter = 0
         local npc_count = lume.count(bodies, "npc")
         if(npc_count < (love.math.random() * sys_pop(bodies) * npc_factor)) then
            insert_new(bodies, ships, true)
         end
      end
      for i,s in lume.ripairs(ships) do
         if not s.client then
            local ok, err = pcall(update, bodies, s, dt)
            if not ok then
               print("autopilot error:", err)
               table.remove(ships, i)
            end
         end
      end
   end,

   spawn = function(server) insert_new(server.system.bodies, server.ships, true) end,
   make = make,
   takeover = function(ship, target)
      ship.engine_strength = 5120
      ship.projection = 60
      ship.target_range = 1000
      ship.target = target
      ship.client = nil
   end
}
