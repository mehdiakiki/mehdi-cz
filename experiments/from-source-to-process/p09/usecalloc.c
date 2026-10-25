#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    int *p = calloc(4, sizeof *p);
    printf("%d\n", p[0]);
    free(p);
    return 0;
}
