// Un registro y su recibo se guardan juntos. Si se pierde la respuesta HTTP, repetir no lo duplica.
export const ONCE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
local commands = cjson.decode(ARGV[1])
for i = 1, #commands do
  local command = commands[i]
  if command[1] == 'HUELLITA_ASSEMBLE' then
    local parts = {}
    for j = 3, #command do
      local part = redis.call('GET', command[j])
      if not part then return redis.error_reply('Falta una parte del recuerdo') end
      parts[#parts + 1] = part
    end
    redis.call('SET', command[2], table.concat(parts))
    for j = 3, #command do redis.call('DEL', command[j]) end
  else
    redis.call(unpack(command))
  end
end
redis.call('SET', KEYS[1], '1')
return 1
`;
