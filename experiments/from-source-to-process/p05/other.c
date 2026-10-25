#include <stdio.h>

int total = 41;
int read_counter(void);
int read_total(void);
void call_greet(void);
extern int *pointer;

void greet(void)
{
    puts("hello from greet");
}

int main(void)
{
    call_greet();
    printf("counter %d, total %d, *pointer %d\n", read_counter(), read_total(), *pointer);
    return 0;
}
