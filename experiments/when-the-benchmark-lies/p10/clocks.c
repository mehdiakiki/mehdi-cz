#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/timex.h>
#include <time.h>
#include <unistd.h>

#define CALLS 1000000L

struct clock {
    clockid_t id;
    const char *name;
};

static const struct clock clocks[] = {
    {CLOCK_REALTIME, "CLOCK_REALTIME"},
    {CLOCK_MONOTONIC, "CLOCK_MONOTONIC"},
    {CLOCK_MONOTONIC_RAW, "CLOCK_MONOTONIC_RAW"},
    {CLOCK_BOOTTIME, "CLOCK_BOOTTIME"},
    {CLOCK_REALTIME_COARSE, "CLOCK_REALTIME_COARSE"},
    {CLOCK_MONOTONIC_COARSE, "CLOCK_MONOTONIC_COARSE"},
    {CLOCK_PROCESS_CPUTIME_ID, "CLOCK_PROCESS_CPUTIME_ID"},
    {CLOCK_THREAD_CPUTIME_ID, "CLOCK_THREAD_CPUTIME_ID"},
};

static long long ns(clockid_t id)
{
    struct timespec t;
    clock_gettime(id, &t);
    return t.tv_sec * 1000000000LL + t.tv_nsec;
}

static void table(void)
{
    printf("%-26s %12s %12s %16s %12s\n", "clock", "resolution", "ns per call", "smallest step", "zero steps");
    for (size_t c = 0; c < sizeof clocks / sizeof clocks[0]; c++) {
        struct timespec res;
        clock_getres(clocks[c].id, &res);
        long long start = ns(CLOCK_MONOTONIC);
        for (long i = 0; i < CALLS; i++)
            ns(clocks[c].id);
        double per_call = (double)(ns(CLOCK_MONOTONIC) - start) / CALLS;
        long long smallest = -1, zeros = 0, prev = ns(clocks[c].id);
        for (long i = 0; i < CALLS; i++) {
            long long now = ns(clocks[c].id);
            long long step = now - prev;
            if (step == 0)
                zeros++;
            else if (smallest < 0 || step < smallest)
                smallest = step;
            prev = now;
        }
        printf("%-26s %9ld ns %12.1f %13lld ns %12lld\n", clocks[c].name,
               res.tv_sec * 1000000000L + res.tv_nsec, per_call, smallest, zeros);
    }
}

static void calls(clockid_t id)
{
    for (int i = 0; i < 1000; i++)
        ns(id);
}

static void drift(int seconds)
{
    struct timex tx;
    memset(&tx, 0, sizeof tx);
    int state = adjtimex(&tx);
    printf("adjtimex: state %d, frequency correction %+.3f ppm, status 0x%x\n", state, tx.freq / 65536.0, tx.status);
    long long mono0 = ns(CLOCK_MONOTONIC), raw0 = ns(CLOCK_MONOTONIC_RAW), real0 = ns(CLOCK_REALTIME);
    sleep(seconds);
    long long mono = ns(CLOCK_MONOTONIC) - mono0, raw = ns(CLOCK_MONOTONIC_RAW) - raw0;
    long long real = ns(CLOCK_REALTIME) - real0;
    printf("after %d s: MONOTONIC advanced %lld ns, MONOTONIC_RAW %lld ns, REALTIME %lld ns\n", seconds, mono, raw, real);
    printf("MONOTONIC minus MONOTONIC_RAW: %lld ns, that is %+.3f ppm\n", mono - raw, 1e6 * (double)(mono - raw) / raw);
}

static void boottime(void)
{
    long long mono = ns(CLOCK_MONOTONIC);
    long long boot = ns(CLOCK_BOOTTIME);
    printf("CLOCK_MONOTONIC %.1f s since boot, CLOCK_BOOTTIME %.1f s, difference %lld ns\n", mono / 1e9, boot / 1e9,
           boot - mono);
}

int main(int argc, char **argv)
{
    if (argc < 2)
        return 2;
    if (strcmp(argv[1], "table") == 0)
        table();
    else if (strcmp(argv[1], "calls") == 0 && argc == 3)
        calls(clocks[atoi(argv[2])].id);
    else if (strcmp(argv[1], "drift") == 0 && argc == 3)
        drift(atoi(argv[2]));
    else if (strcmp(argv[1], "boottime") == 0)
        boottime();
    else
        return 2;
    return 0;
}
