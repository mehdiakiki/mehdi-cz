#include <stdio.h>
#include <time.h>
#include <x86intrin.h>

int main(void)
{
    struct timespec t0, t1, pause = {0, 200000000};
    clock_gettime(CLOCK_MONOTONIC, &t0);
    unsigned long long c0 = __rdtsc();
    nanosleep(&pause, NULL);
    unsigned long long c1 = __rdtsc();
    clock_gettime(CLOCK_MONOTONIC, &t1);
    double ns = (t1.tv_sec - t0.tv_sec) * 1e9 + (t1.tv_nsec - t0.tv_nsec);
    printf("TSC rate: %.3f GHz (%.0f cycles per microsecond)\n", (c1 - c0) / ns, (c1 - c0) / ns * 1000);
    return 0;
}
