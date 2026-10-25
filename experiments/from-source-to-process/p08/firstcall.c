#include <stdio.h>
#include <stdlib.h>
#include <x86intrin.h>

int main(void)
{
    volatile int x = -5;
    unsigned int aux;
    _mm_lfence();
    unsigned long long t0 = __rdtscp(&aux);
    int a = labs(x);
    unsigned long long t1 = __rdtscp(&aux);
    int b = labs(x);
    unsigned long long t2 = __rdtscp(&aux);
    printf("%llu %llu %d\n", t1 - t0, t2 - t1, a + b);
    return 0;
}
