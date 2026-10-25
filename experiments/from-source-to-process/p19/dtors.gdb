# Prints a short backtrace at every registration of a thread-local destructor, until the program ends.
set debuginfod enabled off
set breakpoint pending on
set pagination off
break __cxa_thread_atexit_impl
commands
bt 3
continue
end
run
