-- -*- lua -*-
local vector, vector_functions
local graphics = love.graphics
local lume = require("lume")
local grav = require("grav")
local half_hyperbola = require("conics")

vector_functions = {
   data = function (v)
      return {x=v.x, y=v.y}
   end,

   copy = function (v)
      return vector(v.x, v.y)
   end,

   add = function(u, v)
      u.x = u.x+ v.x
      u.y = u.y+ v.y
      return u
   end,

   sum = function(u, v)
      return vector(u.x+v.x, u.y+v.y)
   end,

   sqr = function(v)
      return v.x*v.x + v.y*v.y
   end,

   abs = function(v)
      return math.sqrt(vector_functions.sqr(v))
   end,

   mul = function(v, k)
      v.x = v.x*k
      v.y = v.y*k
      return v
   end,

   prod = function(v, k)
      return vector(v.x*k,v.y*k)
   end,

   neg = function(v)
      v.x = - v.x
      v.y = - v.y
      return v
   end,

   negated = function(v)
      return vector(-v.x, -v.y)
   end,

   sub = function (u,v)
      u.x = u.x - v.x
      u.y = u.y - v.y
      return u
   end,

   difference = function (u,v)
      return vector (u.x-v.x, u.y-v.y)
   end,

   rotate = function(u,a)
      local x1 = math.cos(a)*u.x-math.sin(a)*u.y
      local y1 = math.cos(a)*u.y+math.sin(a)*u.x
      u.x, u.y = x1, y1
      return u
   end,

   rotated = function(u,a)
      local x1 = math.cos(a)*u.x-math.sin(a)*u.y
      local y1 = math.cos(a)*u.y+math.sin(a)*u.x
      return vector(x1, y1)
   end,

   rotate_deg = function(u,a)
      return vector_functions.rotate(u,a*math.pi/180)
   end,

   rotated_deg = function(u,a)
      return vector_functions.rotated(u,a*math.pi/180)
   end,

   describe = function(v)
      return "{ x=" .. v.x .. ", y=" .. v.y .. " }"
   end,

   area_with = function (u,v)
      return u.x*v.y - u.y*v.x
   end,

   normalize = function(v)
      return vector_functions.mul(v,
                                  1/vector_functions.abs(v))
   end,

   normalized = function(v)
      return vector_functions.prod(v,
                                   1/vector_functions.abs(v))
   end,

   direction = function(v)
      if vector_functions.abs(v)>1e-20 then
         return math.atan2(v.x, v.y)
      else
         return 0
      end
   end,

   direction_deg = function(v)
      return vector_functions.direction(v)*180/math.pi
   end,

   assign = function (u, v)
      u.x = v.x
      u.y = v.y
      return u
   end,
}

vector = function(x,y)
   local res = { x=x, y=y }
   if setmetatable then
      setmetatable(res, {__index = vector_functions})
   else
      for k,v in pairs(vector_functions) do
         res[k]=v
      end
   end
   return res
end

local kinetic_energy_wrt = function(reference, target)
   return 0.5 * target.mass * lume.distance(
      target.dx, target.dy,
      reference.dx, reference.dy,
      true
                                           )
end

local gravitational_energy_wrt = function(reference, target)
   return - target.mass * reference.mass * grav.g /
      lume.distance(
         target.x, target.y, reference.x, reference.y
      )
end

local total_energy_wrt = function(reference, target)
   return kinetic_energy_wrt(reference, target) +
      gravitational_energy_wrt(reference, target)
end

local is_gravitationally_bound = function(reference, target)
   return total_energy_wrt(reference, target)<0
end

local orbit_center = function(bodies, target, closed)
   local res = nil
   local q = 0
   for _, b in pairs(bodies) do
      if b.dx and b.dy and b.mass then
         local r2 = vector_functions.difference(b, target):sqr()
         if (r2>1e-20) and (is_gravitationally_bound(b, target) or not closed) then
            local b_q = b.mass / r2^1.25
            if b_q > q then
               res = b
               q = b_q
            end
         end
      end
   end
   return res
end

local calculateOrbit = function(M,v,r)
   local L = r:area_with(v)
   local k = M*grav.g;
   local E = v:sqr()/2-M*grav.g/r:abs()
   local a = 0
   if (math.abs(L)>1e-10) then
      a=math.abs(k/L)
   end
   local D = 2*E+a*a;
   local v1 = 0;
   local v2 = 0;
   local r1 = 0;
   local r2 = 0;
   if(D>0) then
      v1 = a-math.sqrt(D);
      v2 = a+math.sqrt(D);
   end
   if(math.abs(v1)>1e-20) then r1 = L/v1 end
   if(math.abs(v2)>1e-20) then r2 = L/v2 end
   local b = 0
   if(math.abs(E)>1e-20) then
      b = L / math.sqrt(math.abs(E*2))
   end
   local axisVector = v:prod(L):rotate_deg(-90):difference(
      r:normalized():mul(k))
   local orbitDirection = axisVector:direction_deg()
   if(L<0) then orbitDirection=orbitDirection+180 end
   return {
      direction= orbitDirection,
      r1= r1,
      r2= r2,
      v1= v1,
      v2= v2,
      a= (r1+r2)/2,
      b= b,
      c= (r1-r2)/2,
      d= r2,
   }
end

local velocity_vector = function(obj)
   return vector(obj.dx, obj.dy)
end

local current_orbit = function(bodies, target, reference, closed)
   reference = reference or orbit_center(bodies, target, closed)
   return calculateOrbit(reference.mass,
                         velocity_vector(target):sub(velocity_vector(reference)),
                         vector_functions.difference(target, reference))
end

local aoi = function(bodies, b)
   local center = orbit_center(bodies, b, false)
   if center and b and (center.mass > b.mass) then
      local r_aoi = vector_functions.difference(b,center):abs()*
         (b.mass/center.mass)^(2/5)
      local r_max_df = vector_functions.difference(b,center):abs()*
         (b.mass/center.mass)^(1/3)
      local r_max_f = vector_functions.difference(b,center):abs()*
         (b.mass/center.mass)^(1/2)
      graphics.push()
      graphics.translate(b.x, b.y)
      graphics.setColorI(0,255,200,3)
      graphics.circle("fill", 0, 0, r_max_df)
      graphics.circle("fill", 0, 0, r_aoi)
      graphics.circle("fill", 0, 0, r_max_f)
      graphics.pop()
   end
end

local fixed_orbit = function(bodies, b, color)
   local around = lume.match(bodies, function(x) return x.name == b.orbiting end)
   graphics.setColorI(color)
   graphics.circle("line", around.x, around.y, b.r/16) -- TODO ellipse
end

local orbit = function(bodies, b, color)
   if(b.star) then return true end
   if(b.orbiting) then return fixed_orbit(bodies, b, color) end
   local center = orbit_center(bodies, b, true)
   graphics.setLineWidth(3)
   if center then
      local orbit_data = current_orbit(bodies, b, center)
      graphics.push()
      graphics.rotate((-90-orbit_data.direction)*math.pi/180)
      graphics.setColorI(color)
      graphics.ellipse("line", orbit_data.c,0, orbit_data.a,orbit_data.b, 360)
      graphics.pop()
   end
   -- TODO: this next bit is totally busted
   local center_open = orbit_center(bodies, b, false)
   if center_open and (not center or
                          vector_functions.difference(center_open, center):
                       abs()>1e-10) then
      local orbit_data = current_orbit(bodies, b, center_open)
      graphics.push()
      graphics.rotate((-90-orbit_data.direction)*math.pi/-180)
      graphics.setColorI(color)
      half_hyperbola("line", orbit_data.c,0, -orbit_data.a, orbit_data.b, 360)
      graphics.pop()
   end

end

return {orbit = orbit, aoi = aoi}
