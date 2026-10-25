#include <stdio.h>
#include <stdlib.h>
#include <time.h>

static long now_ns(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000000000L + ts.tv_nsec;
}

int main(void)
{
    long ns[3];
    long sink = 0;
    now_ns();
    for (int i = 0; i < 3; i++) {
        long start = now_ns();
        sink += random();
        ns[i] = now_ns() - start;
    }
    printf("random(): first call %ld ns, second call %ld ns, third call %ld ns (sink %ld)\n",
           ns[0], ns[1], ns[2], sink);
    return 0;
}
