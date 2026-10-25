#include <stdint.h>
#include <stdio.h>
#include <time.h>

#define LEN 4096
#define ITERS 1000000L

static uint64_t data[LEN];
volatile uint64_t sink;

static uint64_t sum(const uint64_t *p, size_t n)
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

__attribute__((noinline)) long bench_unused(const uint64_t *p, long iters)
{
    long start = now_ns();
    for (long i = 0; i < iters; i++)
        sum(p, LEN);
    return now_ns() - start;
}

__attribute__((noinline)) long bench_volatile(const uint64_t *p, long iters)
{
    long start = now_ns();
    for (long i = 0; i < iters; i++)
        sink = sum(p, LEN);
    return now_ns() - start;
}

__attribute__((noinline)) long bench_barrier(const uint64_t *p, long iters)
{
    long start = now_ns();
    for (long i = 0; i < iters; i++) {
        __asm__ volatile("" : "+r"(p));
        uint64_t s = sum(p, LEN);
        __asm__ volatile("" : : "r"(s));
    }
    return now_ns() - start;
}

static void show(const char *name, long ns)
{
    printf("%-17s total %11ld ns  %11.5f ns per call\n", name, ns, (double)ns / ITERS);
}

int main(void)
{
    for (size_t i = 0; i < LEN; i++)
        data[i] = i;
    printf("sum of %d uint64_t values, %ld calls per line\n", LEN, ITERS);
    show("unused result", bench_unused(data, ITERS));
    show("volatile sink", bench_volatile(data, ITERS));
    show("asm barrier", bench_barrier(data, ITERS));
    return 0;
}
