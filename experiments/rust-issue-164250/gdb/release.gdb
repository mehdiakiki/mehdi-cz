set debuginfod enabled off
set pagination off
set confirm off
break '<&&alloc::string::String as core::fmt::Display>::fmt'
run > /dev/null
set language c
printf "first argument (rdi): %p\n", $rdi
set $kept = **(void ***)$rdi
printf "the kept reference points to %p, the three words there:\n", $kept
x/3gx $kept
kill
