#include <stdio.h>
#include <stdlib.h>

extern char __executable_start;

int counter = 42;
int zeroed;
const int limit = 100;
const char *greeting = "hello";
const char *const motto = "fixed";
static int hidden = 7;

static void show(const char *name, const void *p)
{
    printf("%-22s %14p  offset 0x%lx\n", name, p, (unsigned long)((const char *)p - &__executable_start));
}

int main(void)
{
    static int calls;
    static int seeded = 5;
    int local = 1;
    int *heap = malloc(sizeof *heap);

    calls++;
    show("main (code)", (const void *)main);
    show("counter = 42", &counter);
    show("zeroed", &zeroed);
    show("limit (const)", &limit);
    show("greeting (pointer)", &greeting);
    show("\"hello\" (the bytes)", greeting);
    show("motto (const pointer)", &motto);
    show("hidden (static)", &hidden);
    show("calls (static local)", &calls);
    show("seeded (static local)", &seeded);
    printf("%-22s %14p\n", "local", (void *)&local);
    printf("%-22s %14p\n", "heap (malloc)", (void *)heap);
    free(heap);
    return 0;
}
