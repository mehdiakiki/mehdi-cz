#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <time.h>

#define SIZE (1UL << 30)
#define PAGE 4096UL

static void *(*volatile fill)(void *, int, size_t) = memset;

static long vmstat(const char *name)
{
    char key[64];
    long value, found = -1;
    FILE *f = fopen("/proc/vmstat", "r");
    while (f && fscanf(f, "%63s %ld", key, &value) == 2)
        if (strcmp(key, name) == 0)
            found = value;
    if (f)
        fclose(f);
    return found;
}

static double now(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec / 1e9;
}

static long minor_faults(void)
{
    struct rusage r;
    getrusage(RUSAGE_SELF, &r);
    return r.ru_minflt;
}

static void report(const char *label, double seconds, long faults)
{
    printf("  %-28s %8.1f ms %8ld minor faults %6.0f ns per 4 KiB page\n", label, seconds * 1e3, faults,
           seconds * 1e9 / (SIZE / PAGE));
}

static void touch(const char *label, volatile char *p)
{
    long alloc0 = vmstat("thp_fault_alloc"), fallback0 = vmstat("thp_fault_fallback");
    long f0 = minor_faults();
    double t0 = now();
    for (size_t i = 0; i < SIZE; i += PAGE)
        p[i] = 1;
    report(label, now() - t0, minor_faults() - f0);
    printf("  %-28s thp_fault_alloc +%ld, thp_fault_fallback +%ld\n", "(whole system, /proc/vmstat)",
           vmstat("thp_fault_alloc") - alloc0, vmstat("thp_fault_fallback") - fallback0);
}

static void anon_huge_pages(void)
{
    char line[256];
    FILE *f = fopen("/proc/self/smaps_rollup", "r");
    while (f && fgets(line, sizeof line, f))
        if (strncmp(line, "AnonHugePages:", 14) == 0 || strncmp(line, "Rss:", 4) == 0)
            printf("  %s", line);
    if (f)
        fclose(f);
}

int main(int argc, char **argv)
{
    const char *mode = argc > 1 ? argv[1] : "default";
    char *p;
    printf("%s:\n", mode);
    if (strcmp(mode, "malloc-memset") == 0 || strcmp(mode, "calloc") == 0) {
        long f0 = minor_faults();
        double t0 = now();
        if (strcmp(mode, "calloc") == 0) {
            p = calloc(1, SIZE);
        } else {
            p = malloc(SIZE);
            fill(p, 0, SIZE);
        }
        report("allocation", now() - t0, minor_faults() - f0);
    } else {
        int flags = MAP_PRIVATE | MAP_ANONYMOUS | (strcmp(mode, "populate") == 0 ? MAP_POPULATE : 0);
        long f0 = minor_faults();
        double t0 = now();
        p = mmap(NULL, SIZE, PROT_READ | PROT_WRITE, flags, -1, 0);
        if (p == MAP_FAILED)
            return 1;
        if (strcmp(mode, "nohugepage") == 0)
            madvise(p, SIZE, MADV_NOHUGEPAGE);
        if (strcmp(mode, "hugepage") == 0)
            madvise(p, SIZE, MADV_HUGEPAGE);
        report("mmap", now() - t0, minor_faults() - f0);
    }
    touch("first pass", p);
    touch("second pass", p);
    anon_huge_pages();
    return 0;
}
