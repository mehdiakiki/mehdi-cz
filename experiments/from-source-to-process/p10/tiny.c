__attribute__((noreturn)) void _start(void)
{
    __asm__ volatile("syscall" : : "a"(60), "D"(STATUS));
    __builtin_unreachable();
}
