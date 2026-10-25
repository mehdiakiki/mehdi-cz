set debuginfod enabled off
set pagination off
set confirm off
break repro.rs:12
run > /dev/null
set language c
printf "before the end of the block, l is at %p, its three words:\n", &l
x/3gx &l
x/s *(char **)((char *)&l + 8)
break '<&&alloc::string::String as core::fmt::Display>::fmt'
continue
set $kept = **(void ***)$rdi
printf "during println, the kept reference points to %p, the three words there:\n", $kept
x/3gx $kept
x/s *(char **)((char *)$kept + 8)
frame function repro::main
printf "_z is at %p, its three words:\n", &_z
x/3gx &_z
kill
