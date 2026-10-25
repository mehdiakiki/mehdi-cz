#define _GNU_SOURCE
#include <spawn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define RUNS 11

extern char **environ;
static void *(*volatile fill)(void *, int, size_t) = memset;

static double now(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec / 1e9;
}

static int cmp(const void *a, const void *b)
{
    double x = *(const double *)a, y = *(const double *)b;
    return (x > y) - (x < y);
}

int main(int argc, char **argv)
{
    if (argc < 2)
        return 2;
    size_t size = strtoul(argv[1], NULL, 10) << 20;
    if (size) {
        char *p = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
        if (p == MAP_FAILED)
            return 1;
        madvise(p, size, MADV_NOHUGEPAGE);
        fill(p, 1, size);
    }
    double forks[RUNS], spawns[RUNS];
    char *spawn_argv[] = {"/bin/true", NULL};
    for (int i = 0; i < RUNS; i++) {
        double t0 = now();
        pid_t pid = fork();
        if (pid == 0)
            _exit(0);
        forks[i] = (now() - t0) * 1e3;
        waitpid(pid, NULL, 0);
        t0 = now();
        if (posix_spawn(&pid, "/bin/true", NULL, NULL, spawn_argv, environ) != 0)
            return 1;
        spawns[i] = (now() - t0) * 1e3;
        waitpid(pid, NULL, 0);
    }
    qsort(forks, RUNS, sizeof(double), cmp);
    qsort(spawns, RUNS, sizeof(double), cmp);
    printf("%5s MiB touched: fork() median %7.2f ms (min %6.2f, max %6.2f)   posix_spawn() median %5.2f ms\n", argv[1],
           forks[RUNS / 2], forks[0], forks[RUNS - 1], spawns[RUNS / 2]);
    return 0;
}
