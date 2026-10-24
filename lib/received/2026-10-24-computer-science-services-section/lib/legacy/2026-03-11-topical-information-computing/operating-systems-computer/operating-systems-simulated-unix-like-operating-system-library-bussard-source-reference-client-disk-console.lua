-- This -*- lua -*- defines a console mode which is for entering Lua code
-- to run directly for experimentation.
local pack = function(...) return {...} end

local jump_to_error = function()
   local _, point_line = editor.point()
   local line = editor["get-line"](point_line)
   -- Pattern matches "<spaces>[string "buffer-name"]:line-number"
   local path, line_num = line:match("%s*%[string \"([^\"]*)\"%]:(%d*)")
   if(editor["file-type"](path) == "file") then
      editor.open(path)
      editor["go-to"](tonumber(line_num))
      return true
   end
end

local eval = function()
   -- if you're not on the last line, enter just bumps you down.
   if(editor["get-line-number"]() ~= editor["get-max-line"]()) then
      if(not jump_to_error()) then
         editor.cmd["end-of-buffer"]()
      end
   end

   local input = editor["get-input"]()
   editor["history-push"](input)
   editor.cmd["end-of-line"]()
   editor.cmd.newline()
   editor.cmd["no-mark"]()

   -- try to compile the input.
   local ls = editor["get-prop"]("loadstring", loadstring)
   local chunk, err = ls("return " .. input)
   if(err and not chunk) then -- maybe it's a statement, not an expression
      chunk, err = ls(input)
      if(not chunk) then
         editor.print("! Compilation error: " .. err or "Unknown error")
         editor["print-prompt"]()
         editor.cmd["end-of-buffer"]()
         return false
      end
   end

   -- try runnig the compiled code in protected mode.
   local trace
   local result = pack(xpcall(chunk, function(e)
                                 trace = debug.traceback()
                                 err = e end))

   if(result[1]) then
      local output, i = lume.serialize(result[2]), 3
      if result[2] == editor.invisible then
         editor["print-prompt"]()
         return true
      end
      -- pretty-print out the values it returned.
      while i <= #result do
         output = output .. ', ' .. lume.serialize(result[i])
         i = i + 1
      end
      editor.print(output)
   else
      -- display the error and stack trace.
      editor.print('! Evaluation error: ' .. err or "Unknown")
      local lines = lume.split(trace, "\n")
      for i,l in pairs(lines) do
         -- editor infrastructure wraps 8 levels of irrelevant gunk
         if(i < #lines - 8) then editor.print(l) end
      end
   end
   editor["print-prompt"]()
end

return {
   name = "console",
   parent = "edit",
   map = {
      ["return"] = eval,
      tab = editor.cmd.complete,
   },
   ctrl = {
      a = editor.cmd["beginning-of-input"],
      up = editor.cmd["history-prev"],
      down = editor.cmd["history-next"],
      m = eval,
      i = editor.cmd.complete,
   },
   alt = {
      p = editor.cmd["history-prev"],
      n = editor.cmd["history-next"],
   },
}
