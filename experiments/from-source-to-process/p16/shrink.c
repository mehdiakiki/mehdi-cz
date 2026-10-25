#define _GNU_SOURCE
#include <malloc.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define BLOCKS 1000000
#define SIZE 100

static void *(*volatile fill)(void *, int, size_t) = memset;
static char **blocks;
static int threads;
static int keep_every;

static long rss_kib(void)
{
    long size = 0, resident = 0;
    FILE *f = fopen("/proc/self/statm", "r");
    if (f && fscanf(f, "%ld %ld", &size, &resident) != 2)
        resident = 0;
    if (f)
        fclose(f);
    return resident * (sysconf(_SC_PAGESIZE) / 1024);
}

static void report(const char *step)
{
    printf("  %-52s Rss %7ld KiB\n", step, rss_kib());
    fflush(stdout);
}

static void *work(void *arg)
{
    long t = (long)arg, per = BLOCKS / threads;
    for (long i = t * per; i < (t + 1) * per; i++) {
        blocks[i] = malloc(SIZE);
        fill(blocks[i], 1, SIZE);
    }
    return NULL;
}

static void *release(void *arg)
{
    long t = (long)arg, per = BLOCKS / threads;
    for (long i = t * per; i < (t + 1) * per; i++)
        if (keep_every == 0 || i % keep_every != 0) {
            free(blocks[i]);
            blocks[i] = NULL;
        }
    return NULL;
}

static void run_all(void *(*fn)(void *))
{
    if (threads == 1) {
        fn((void *)0L);
        return;
    }
    pthread_t ids[64];
    for (long t = 0; t < threads; t++)
        pthread_create(&ids[t], NULL, fn, (void *)t);
    for (long t = 0; t < threads; t++)
        pthread_join(ids[t], NULL);
}

int main(int argc, char **argv)
{
    threads = argc > 1 ? atoi(argv[1]) : 1;
    keep_every = argc > 2 ? atoi(argv[2]) : 1000;
    blocks = calloc(BLOCKS, sizeof *blocks);
    printf("%d thread(s), %d blocks of %d bytes, keep every %d:\n", threads, BLOCKS, SIZE, keep_every);
    report("start");
    run_all(work);
    report("after malloc of all blocks");
    run_all(release);
    report(keep_every ? "after free of all blocks except every 1000th" : "after free of all blocks");
    if (getenv("SHOW_STATS"))
        malloc_stats();
    malloc_trim(0);
    report("after malloc_trim(0)");
    for (long i = 0; i < BLOCKS; i++)
        free(blocks[i]);
    report("after free of the kept blocks too");
    return 0;
}
