_Thread_local long lib_counter = 7;
long lib_global = 7;

long lib_constant(void)
{
    return 7;
}

long lib_tls_read(void)
{
    return lib_counter;
}

long lib_global_read(void)
{
    return lib_global;
}
