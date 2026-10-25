#include <stdio.h>
#include <stdlib.h>

static void at_exit_handler(void)
{
    puts("atexit handler");
}

__attribute__((constructor(101))) static void first(void)
{
    puts("constructor 101");
}

__attribute__((constructor(102))) static void second(void)
{
    puts("constructor 102");
}

__attribute__((constructor)) static void plain(void)
{
    puts("constructor without priority");
    atexit(at_exit_handler);
}

__attribute__((destructor(101))) static void last(void)
{
    puts("destructor 101");
}

__attribute__((destructor)) static void plain_end(void)
{
    puts("destructor without priority");
}

int main(void)
{
    puts("main");
    return 0;
}
