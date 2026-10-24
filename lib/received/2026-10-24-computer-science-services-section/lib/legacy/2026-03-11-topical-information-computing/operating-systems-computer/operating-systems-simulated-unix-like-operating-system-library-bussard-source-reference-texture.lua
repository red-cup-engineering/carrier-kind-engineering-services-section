-- functions for texture generation
local utils = require("utils")

local generators = {icy_gas=
                       function(s,x,y,z)
                          local a,c = 1/120000, 1/32000
                          local g = love.math.noise(s*a*x,s*a*y,s*a*z)*64
                          local b = love.math.noise(s*c*x,s*c*y,s*c*z)*128
                          return {0,g,b}
                       end,
                    gas=
                       function(s,x,y,_)
                          local h = 29 + (s-0.5) * 3
                          local n = s*y + love.math.noise(x/30)
                          return {utils.hsv(h,255, love.math.noise(n)*200+25)}
                       end,
                    terrestrial=
                       function(s,x,y,z)
                          local m = 0.02
                          local level = love.math.noise(m*(s+x),m*(s+y),m*(s+z))
                          if(level < 0.5) then
                             return {0,0,(level+0.5)*255}
                          else
                             return {255*(level-0.5),level*255,0}
                          end
                       end,
                    ice=
                       function(s,x,y,z)
                          local m = 0.02
                          local level = love.math.noise(m*(s+x),m*(s+y),m*(s+z))
                          local c = level * 200
                          if(level < 0.3) then
                             local g = 100+c
                             return {g,g,g} -- gray
                          elseif(level < 0.65) then
                             local rg = (level-0.3) * 150
                             return {245-rg,245-rg,255} -- white
                          else -- blue
                             return {c,c,math.min(c+100, 255)}
                          end
                       end,}

local random = function(radius,f)
   radius = radius / 4
   local step = 0.01
   local w,h = math.ceil(radius*2*math.pi), math.ceil(radius*2)
   local data = love.image.newImageData(w,h)
   -- if we just generate a 2d rectangle texture, the edges won't wrap nicely,
   -- so instead we generate 3d noise based on coordinates in a sphere.
   for thx = -math.pi,math.pi,step do
      local x = radius * math.cos(thx)
      for thy = -math.pi,math.pi,step do
         local y = radius * math.cos(thy)
         local z = radius * math.sin(thx) * math.sin(thy)
         local tx, ty = w*(thx+math.pi)/(2*math.pi), h*(thy+math.pi)/(2*math.pi)
         data:setPixel(tx,ty,unpack(f(x,y,z)))
      end
   end
   return love.graphics.newImage(data)
end

return {random=random, generators=generators}
