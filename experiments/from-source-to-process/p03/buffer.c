#include <stdio.h>

char buffer[16 * 1024 * 1024] = {FIRST};

int main(void)
{
    printf("first byte %d, size %zu\n", buffer[0], sizeof buffer);
    return 0;
}
