local opts = {...}
local session_code = table.remove(opts, 1)
local f, load_err = loadfile(session_code)

if(f) then
   local ok, err = xpcall(f, function(e) print(e, debug.traceback()) end,
                          unpack(opts))
   if(not ok) then print(err) end
else
   print(load_err)
end
