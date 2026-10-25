#include <stdio.h>
#include <stdlib.h>
#include <time.h>

long lib_constant(void);
long lib_tls_read(void);
long lib_global_read(void);

_Thread_local long exe_counter = 7;
long exe_global = 7;

__attribute__((noipa)) long exe_constant(void)
{
    return 7;
}

__attribute__((noipa)) long exe_tls_read(void)
{
    return exe_counter;
}

__attribute__((noipa)) long exe_global_read(void)
{
    return exe_global;
}

static volatile long sink;

static double ns_per_call(long (*volatile f)(void), long n)
{
    struct timespec a, b;
    long sum = 0;
    clock_gettime(CLOCK_MONOTONIC, &a);
    for (long i = 0; i < n; i++)
        sum += f();
    clock_gettime(CLOCK_MONOTONIC, &b);
    sink = sum;
    return ((b.tv_sec - a.tv_sec) * 1e9 + (b.tv_nsec - a.tv_nsec)) / n;
}

static int compare(const void *a, const void *b)
{
    double x = *(const double *)a, y = *(const double *)b;
    return (x > y) - (x < y);
}

struct test {
    const char *name;
    long (*f)(void);
    double t[7];
};

static void measure(struct test *tests, int count, long n)
{
    for (int r = 0; r < 7; r++)
        for (int i = 0; i < count; i++)
            tests[i].t[r] = ns_per_call(tests[i].f, n);
    for (int i = 0; i < count; i++) {
        double *t = tests[i].t;
        qsort(t, 7, sizeof t[0], compare);
        printf("  %-46s %5.2f ns per call (min %5.2f, max %5.2f)\n", tests[i].name, t[3], t[0], t[6]);
    }
}

int main(int argc, char **argv)
{
    long n = argc > 1 ? atol(argv[1]) : 100000000;
    struct test tests[] = {
        {"executable, function returning a constant", exe_constant, {0}},
        {"executable, thread-local variable", exe_tls_read, {0}},
        {"executable, normal global variable", exe_global_read, {0}},
        {"shared library, function returning a constant", lib_constant, {0}},
        {"shared library, thread-local variable", lib_tls_read, {0}},
        {"shared library, normal global variable", lib_global_read, {0}},
    };
    measure(tests, sizeof tests / sizeof tests[0], n);
    return 0;
}
