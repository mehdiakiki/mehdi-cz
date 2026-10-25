import re

import gdb

gdb.execute("set pagination off")
gdb.execute("set debuginfod enabled off")
gdb.execute("run")
print(gdb.execute("bt", to_string=True))
code = gdb.execute("disassemble", to_string=True)
print(code)
print(gdb.execute("info registers rax", to_string=True))
slot = re.search(r"call\s+\*0x[0-9a-f]+\(%rip\)\s+# (0x[0-9a-f]+)", code).group(1)
print(f"the call before the crash goes through the pointer at {slot}, which points to:")
print(gdb.execute(f"info symbol *(void **){slot}", to_string=True))
