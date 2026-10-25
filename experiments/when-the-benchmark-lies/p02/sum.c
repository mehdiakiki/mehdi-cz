#include <stdint.h>
#include <stdio.h>
#include <time.h>

#define LEN 4096
#define ITERS 20000L

static uint64_t data[LEN];

__attribute__((noinline)) uint64_t sum(const uint64_t *p, size_t n)
{
    uint64_t s = 0;
    for (size_t i = 0; i < n; i++)
        s += p[i];
    return s;
}

static long now_ns(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000000000L + ts.tv_nsec;
}

int main(void)
{
    for (size_t i = 0; i < LEN; i++)
        data[i] = i;
    for (int run = 0; run < 5; run++) {
        long start = now_ns();
        for (long i = 0; i < ITERS; i++) {
            const uint64_t *p = data;
            __asm__ volatile("" : "+r"(p));
            uint64_t s = sum(p, LEN);
            __asm__ volatile("" : : "r"(s));
        }
        printf("sum: %9.1f ns per call\n", (double)(now_ns() - start) / ITERS);
    }
    return 0;
}
