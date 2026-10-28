local lg = love.graphics

local lume = require("lume")
local texture = require("texture")

local white,earth_atmosphere; do
   local _, minor, _, _ = love.getVersion()
   if minor <= 10 then
      white = function() return 255,255,255,255 end
      earth_atmosphere = {98, 131, 167, 255}
   else
      white = function() return 1,1,1,1 end
      earth_atmosphere = {0.384, 0.514, 0.655, 1}
   end
end

local make_halfring_mesh = function(radius_ratio, texture_percentage,
                                    texture_offset, segments)
   texture_percentage = texture_percentage or 0.5
   texture_offset = texture_offset or 0
   segments = segments or 128
   local vertices = {}
   local inner, outer
   for i = 0, segments do
      inner = {
         radius_ratio * math.cos(i*math.pi/segments),  -- x
         radius_ratio * math.sin(i*math.pi/segments),  -- y
         1,    -- u
         texture_percentage * i / segments + texture_offset,   -- v
         white(),
      }
      outer = {
         math.cos(i*math.pi/segments), -- x
         math.sin(i*math.pi/segments), -- y
         0,    -- u
         texture_percentage * i / segments + texture_offset,   -- v
         white(),
      }
      table.insert(vertices, inner)
      table.insert(vertices, outer)
   end
   return lg.newMesh(vertices, 'strip', 'static')
end

local quad = lg and lg.newMesh({
   {-1, -1, -1, -1, white()},
   { 1, -1,  1, -1, white()},
   {-1,  1, -1,  1, white()},
   { 1,  1,  1,  1, white()},
}, 'strip', 'static')

local spherize = lg and lg.newShader[[spherize.glsl]]
local scroll_v = lg and lg.newShader[[scroll_v.glsl]]
local corona = lg and lg.newShader[[corona.glsl]]
local atmosphere_glow_lighting = lg and lg.newShader[[atmosphere_glow.glsl]]

local atmosphere_glow; if lg then
   atmosphere_glow = lg.newImage("assets/glow-1d.png", {mipmaps = true})
   atmosphere_glow:setWrap('clamp', 'repeat')
   quad:setTexture(atmosphere_glow)
end

local draw_halfring = function(body, lower)
   if not body.ring_mesh then return end
   lg.push()
   lg.rotate(math.pi*lower + body.ring_tilt_xy)
   lg.scale(body.ring_outer_radius,
            body.ring_outer_radius*math.sin(body.ring_tilt_z))
   lg.draw(body.ring_mesh)
   lg.pop()
end

local draw = function(body)
   lg.push()
   local light = {-body.x/body.r, -body.y/body.r, 0}
   lg.translate(body.x, body.y)
   assert(not (body.star and body.ring_texture_name), "Stars can't have rings.")
   if body.star then
     lg.push()
     lg.scale(2*body.radius, 2*body.radius)
     corona:send('time', body.corona_time or 0)
     lg.setShader(corona)
     lg.draw(quad)
     lg.pop()
   end
   if(body.ring_texture_name) then
      scroll_v:send('offset', body.ring_rotation)
      lg.setShader(scroll_v)
      draw_halfring(body, 1)
   end
   lg.push()
   lg.rotate(body.tilt_xy)
   lg.scale(body.radius, body.polar_radius)
   spherize:send('day', body.texture)
   spherize:send('night', body.texture_night)
   spherize:send('tilt', body.tilt_z)
   spherize:send('rotation', body.rotation)
   spherize:send('light', light)
   spherize:send('shade', body.shade)
   lg.setShader(spherize)
   lg.draw(quad)
   if(body.texture_clouds) then
     spherize:send('day', body.texture_clouds)
     spherize:send('night', body.texture_clouds)
     spherize:send('shade', body.cloud_shadow_color)
     spherize:send('rotation', body.clouds_rotation)
     lg.draw(quad)
     love.graphics.setColorI(white())
   end
   if(body.atmosphere) then
      lg.setColorI(body.atmosphere_color)
      atmosphere_glow_lighting:send('light', light)
      lg.setShader(atmosphere_glow_lighting)
      lg.scale(1.38)
      lg.draw(quad)
      lg.setColorI(white())
   end
   lg.pop()
   if(body.ring_texture_name) then
      scroll_v:send('offset', body.ring_rotation+0.5)
      lg.setShader(scroll_v)
      draw_halfring(body, 0)
   end
   lg.setShader()
   lg.pop()
end

local make = function(body)
   body.radius = body.radius or ((body.star and 3048) or
      (body.texture_type == "gas" and body.mass * 2.3) or
      body.mass * 1.5)
   body.aspect_ratio = body.aspect_ratio or 1
   body.rotation_speed = (body.rot and body.rot/19200) or 0.01
   body.tilt_z = body.tilt_z or 0
   body.tilt_xy = body.tilt_xy or 0
   body.rotation = 0
   if body.tilt_z == 0 then
      body.polar_radius = body.aspect_ratio*body.radius
   else
      local alpha = body.tilt_z
      local a = body.aspect_ratio
      body.polar_radius = (body.radius*math.sin(alpha)*
                              math.sqrt(1+(a/math.tan(alpha))^2))
   end

   body.texture = lg and body.texture or lg.newImage("assets/"..body.texture_name)
   if lg and body.texture_night_name then
      body.texture_night = lg.newImage("assets/"..body.texture_night_name)
      body.shade = body.shade or {1,1,1,1}
   elseif body.star then
      body.texture_night = body.texture
      body.shade = {1,1,1,1}
   elseif lg then
      body.texture_night = body.texture
      body.shade = body.shade or {0.03,0.03,0.03,1}
   end

   if lg and body.texture_clouds_name then
      body.texture_clouds = lg.newImage("assets/"..body.texture_clouds_name)
      body.texture_clouds:setWrap('repeat', 'clamp')
      body.cloud_shadow_color = body.cloud_shadow_color or {0.035,0.04,0.06,1}
      body.clouds_rotation = 0
      body.clouds_rotation_speed = body.clouds_rotation_speed or 0
   end
   body.texture:setWrap('repeat', 'clamp')
   body.texture_night:setWrap('repeat', 'clamp')

   if(body.ring_texture_name) then
      body.ring_rotation = 0
      body.ring_rotation_speed = body.ring_rotation_speed or 0
      body.ring_tilt_xy = body.ring_tilt_xy or body.tilt_xy
      body.ring_tilt_z = body.ring_tilt_z or body.tilt_z
      body.ring_outer_radius = body.ring_outer_radius or body.radius*1.5
      body.ring_inner_radius = body.ring_inner_radius or body.radius*0.8175
      body.ring_texture = lg and lg.newImage("assets/"..body.ring_texture_name,
                                             {mipmaps = true})
      body.ring_texture:setFilter('linear', 'linear', 8)
      body.ring_texture:setWrap('clamp', 'repeat')
      body.ring_mesh = make_halfring_mesh(body.ring_outer_radius/
                                             body.ring_inner_radius)
      body.ring_mesh:setTexture(body.ring_texture)
   end

   if body.star then
      body.corona_time = 0
      body.corona_speed = body.corona_speed or 0.1
   end

   if body.atmosphere then
      body.atmosphere_color = body.atmosphere_color or earth_atmosphere
   end
end

local update = function(body, dt)
   body.rotation = body.rotation and (body.rotation + dt*body.rotation_speed)%1
   body.clouds_rotation = body.clouds_rotation and
      (body.clouds_rotation + dt*body.clouds_rotation_speed)%1
   body.ring_rotation = body.ring_rotation and
      (body.ring_rotation + dt*body.ring_rotation_speed)%1
   body.corona_time = body.corona and
      body.corona_time + dt*body.corona_speed
end

local seed_for = function(s)
   return tonumber(s:lower():gsub("[^a-z0-9]", ""), 36)
end

local random = function(body)
   local r = love.math.randomNormal
   love.math.setRandomSeed(body.seed or seed_for(body.name))
   local radius = r(128, 512)
   if(body.texture_type:find("gas")) then radius = radius * 2 end
   local f = lume.fn(texture.generators[body.texture_type], r(256, 512))
   body.rot = body.rot or r(64, 64)
   body.angle = body.angle or math.rad(r(30, 45))
   body.texture = texture.random(radius,f)
   love.math.setRandomSeed(love.timer.getTime())
   return make(body)
end

return {
   make=make,
   draw=draw,
   update=update,
   random=random,
}
