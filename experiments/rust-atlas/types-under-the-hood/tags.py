# Article 9: what a Python value carries besides its value.
import sys

print(f"int 1:            {sys.getsizeof(1)} bytes")
print(f"int 2**70:        {sys.getsizeof(2**70)} bytes")
print(f"float 1.0:        {sys.getsizeof(1.0)} bytes")
print(f"bool True:        {sys.getsizeof(True)} bytes")
print(f"empty list:       {sys.getsizeof([])} bytes")

n = 1_000_000
lst = list(range(n))
pointers = sys.getsizeof(lst)
objects = sum(sys.getsizeof(x) for x in lst[:1000]) // 1000 * n
print(f"list of {n} ints: {pointers} bytes of pointers, about {objects} bytes of int objects")
print(f"the same numbers as Rust u32 would be: {n * 4} bytes")
print(f"type(1) is {type(1).__name__}, and every object carries a pointer to it")
