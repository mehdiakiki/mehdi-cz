#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <sys/syscall.h>
#include <time.h>
#include <unistd.h>

#define ROUNDS 7

static volatile long sink;

__attribute__((noinline)) static long empty_function(long x)
{
    __asm__ volatile("" : "+r"(x));
    return x;
}

static void call_empty(long n)
{
    for (long i = 0; i < n; i++)
        sink = empty_function(i);
}

static void call_getpid(long n)
{
    for (long i = 0; i < n; i++)
        sink = syscall(SYS_getpid);
}

static void call_vdso_clock(long n)
{
    struct timespec ts;
    for (long i = 0; i < n; i++) {
        clock_gettime(CLOCK_MONOTONIC, &ts);
        sink = ts.tv_nsec;
    }
}

static void call_syscall_clock(long n)
{
    struct timespec ts;
    for (long i = 0; i < n; i++) {
        syscall(SYS_clock_gettime, CLOCK_MONOTONIC, &ts);
        sink = ts.tv_nsec;
    }
}

static double now_ns(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec * 1e9 + t.tv_nsec;
}

static int cmp(const void *a, const void *b)
{
    double x = *(const double *)a, y = *(const double *)b;
    return (x > y) - (x < y);
}

static void measure(const char *name, void (*loop)(long), long n)
{
    double per_call[ROUNDS];
    for (int r = 0; r < ROUNDS; r++) {
        double t0 = now_ns();
        loop(n);
        per_call[r] = (now_ns() - t0) / n;
    }
    qsort(per_call, ROUNDS, sizeof(double), cmp);
    printf("  %-44s %7.1f ns per call (min %6.1f, max %6.1f)\n", name, per_call[ROUNDS / 2], per_call[0],
           per_call[ROUNDS - 1]);
}

int main(int argc, char **argv)
{
    long n = argc > 1 ? atol(argv[1]) : 1000000;
    measure("empty function call", call_empty, n * 10);
    measure("syscall(SYS_getpid)", call_getpid, n);
    measure("clock_gettime(CLOCK_MONOTONIC), vDSO", call_vdso_clock, n * 10);
    measure("syscall(SYS_clock_gettime, CLOCK_MONOTONIC)", call_syscall_clock, n);
    return 0;
}
