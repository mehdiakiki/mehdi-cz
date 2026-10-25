#include <stdio.h>

__attribute__((constructor)) static void library_start(void)
{
    puts("library constructor");
}

__attribute__((destructor)) static void library_end(void)
{
    puts("library destructor");
}
