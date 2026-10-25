#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

static void registered_first(void)
{
    printf("handler registered first\n");
}

static void registered_second(void)
{
    printf("handler registered second\n");
}

/* With an argument, the program ends with _exit instead of returning from main. */
int main(int argc, char **argv)
{
    (void)argv;
    atexit(registered_first);
    atexit(registered_second);
    printf("main ends; ");
    if (argc > 1)
        _exit(0);
    return 0;
}
