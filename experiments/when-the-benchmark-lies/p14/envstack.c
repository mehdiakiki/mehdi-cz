#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define N 1024
#define RUNS 7

static float src[N] __attribute__((aligned(4096)));

__attribute__((noinline)) static void copy(float *dst, const float *s)
{
    for (int r = 0; r < 20000; r++) {
        for (int i = 0; i < N; i++)
            dst[i] = s[i] + 1.0f;
        __asm__ volatile("" : : "r"(dst) : "memory");
    }
}

__attribute__((noinline)) static long fib(long n)
{
    return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

static long long now_ns(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec * 1000000000LL + t.tv_nsec;
}

static int cmp(const void *a, const void *b)
{
    long long x = *(const long long *)a, y = *(const long long *)b;
    return (x > y) - (x < y);
}

int main(int argc, char **argv)
{
    int use_fib = argc > 1 && strcmp(argv[1], "fib") == 0;
    float dst[N];
    for (int i = 0; i < N; i++)
        dst[i] = 0;
    long long t[RUNS];
    long sink = 0;
    for (int k = 0; k < RUNS; k++) {
        long long start = now_ns();
        if (use_fib)
            sink += fib(25);
        else
            copy(dst, src);
        t[k] = now_ns() - start;
    }
    qsort(t, RUNS, sizeof t[0], cmp);
    printf("%s local %p %.1f us (sink %ld)\n", use_fib ? "fib" : "copy", (void *)dst, t[RUNS / 2] / 1000.0, sink);
    return 0;
}
