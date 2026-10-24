require("metatable_monkey") -- need to fix pairs before loading lume/fennel
local fennel = require("lib.fennel")

_G.info, _G.dbg = print, function() end
_G.pp = function(x, label) print(label, fennel.view(x)) end

local fennel_opts = {correlate=true, useMetadata=true,
                     moduleName="lib.fennel", checkModuleFields=true,
                     skipModules={["polywell.state"]=true}}

table.insert(package.loaders, fennel.make_searcher(fennel_opts))
fennel.view = require("lib.fennelview")
fennel.path = love.filesystem.getSource() .. "/?.fnl;" ..
   love.filesystem.getSource() .. "/?/init.fnl;" .. fennel.path

_G.info = pp
local pp = function(x, t)
   if(type(t) == "table") then t = fennel.view(t) end
   print(x, t)
end

local lume = require("lib.lume")
package.loaded.lume, _G.lume = lume, lume
package.loaded.fennel = fennel
package.loaded["polywell.lib.lume"] = lume
package.loaded["polywell.lib.fennel"] = fennel
package.loaded["polywell.lib.fennelview"] = fennel.view

local repl = require("lib.stdio")

local start_server = function(options)
   local server = require("server")
   assert(options.port, "Missing --port PORT argument.")
   local state = server.init(options.host, options.port, options.system)
   _G.s = state -- expose it as a global for repl use
   love.update = function(dt) return server.update(state, dt) end
   if not options.headless then
      local draw = require("draw")
      love.graphics.setFont(love.graphics.newFont("assets/fonts/smoothansi.pcf", 13))
      local focus = {1}
      local scale = 3.5
      love.draw = function()
         draw.draw(state.system.bodies, state.ships, scale, focus)
         if love.keyboard.isDown("-") then scale = scale + 0.005
         elseif love.keyboard.isDown("=") then scale = scale - 0.005 end
         scale = math.min(math.max(2.3, scale), 5.2)
      end
      love.keypressed = function(key)
         if key == "escape" or key == "q" then love.event.quit() end
         -- number keys to zoom around different planets or whatever
         if key:find("[0-9]") then
            focus[1] = tonumber(key)
            -- numbers are planets, shift+numbers are ships
            focus[2] = love.keyboard.isDown("lshift", "rshift")
         end
      end
   end
   repl.start()
end

local start_client = function(options)
   local editor = require("polywell")
   local client = require("client")

   lume.extend(love, editor.handlers)
   love.update = editor.handlers.update
   if not options.headless then
      love.draw = editor.draw
      love.graphics.setFont(love.graphics.newFont("assets/fonts/smoothansi.pcf", 13))
      love.keyboard.setTextInput(true)
      love.keyboard.setKeyRepeat(true)
   end

   assert(options.name, "Missing name.")
   client.init(options.host, options.port, options.name)
   repl.start()
end

love.load = function()
   local options = {}
   local i = 2
   while (i <= #arg) do
      local current_argument = arg[i]
      if(current_argument == "--server") then
         options.system = arg[i+1]
         i=i+1
      elseif(current_argument == "--host") then
         options.host = arg[i+1]
         i=i+1
      elseif(current_argument == "--port") then
         options.port = tonumber(arg[i+1])
         i=i+1
      elseif(current_argument == "--name") then
         options.name = arg[i+1]
         i=i+1
      elseif(current_argument == "--headless") then
         options.headless = true
      elseif(current_argument == "--quiet") then
         _G.info = function() end
      elseif(current_argument == "--debug") then
         _G.dbg = pp
      else
         print("Unknown argument: " .. current_argument)
      end
      i = i+1
   end

   if(not options.port) then options.port = 6641 end
   if(not options.host) then options.host = "localhost" end

   if(options.system) then
      start_server(options)
   else
      start_client(options)
   end
end

if(love.getVersion() == 0) then print("Need LÖVE 11+") end
