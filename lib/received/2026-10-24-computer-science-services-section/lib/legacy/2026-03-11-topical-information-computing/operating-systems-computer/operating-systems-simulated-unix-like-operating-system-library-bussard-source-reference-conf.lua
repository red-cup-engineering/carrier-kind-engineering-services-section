love.conf = function(t)
   t.gammacorrect = true
   t.title, t.identity = "Bussard", "bussard-server"
   t.modules.joystick, t.modules.physics = false, false
   t.modules.audio, t.modules.sound = false, false
   t.window.vsync = false
   for _,a in pairs(arg) do
      if(a == "--headless") then
         t.window, t.modules.window, t.modules.graphics = false, false, false
      end
   end
end
