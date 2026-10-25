#define _GNU_SOURCE
#include <spawn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define PAGE 4096UL

extern char **environ;
static void *(*volatile fill)(void *, int, size_t) = memset;

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

static void rollup(const char *who, pid_t pid)
{
    char path[64], line[256];
    snprintf(path, sizeof path, "/proc/%d/smaps_rollup", (int)pid);
    FILE *f = fopen(path, "r");
    while (f && fgets(line, sizeof line, f))
        if (strncmp(line, "Rss:", 4) == 0 || strncmp(line, "Pss:", 4) == 0 || strncmp(line, "AnonHugePages:", 14) == 0)
            printf("    %-6s %s", who, line);
    if (f)
        fclose(f);
}

int main(int argc, char **argv)
{
    if (argc < 4)
        return 2;
    size_t size = strtoul(argv[1], NULL, 10) << 20;
    const char *work = argv[2];
    int huge = strcmp(argv[3], "huge") == 0;
    char *p = NULL;
    int ready[2], go[2];

    if (size) {
        p = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
        if (p == MAP_FAILED)
            return 1;
        madvise(p, size, huge ? MADV_HUGEPAGE : MADV_NOHUGEPAGE);
        fill(p, 1, size);
    }
    printf("%s MiB, child %s, %s:\n", argv[1], work, huge ? "MADV_HUGEPAGE" : "MADV_NOHUGEPAGE");
    rollup("parent", getpid());
    fflush(stdout);
    if (pipe(ready) || pipe(go))
        return 1;

    double t0 = now();
    pid_t pid = fork();
    if (pid == 0) {
        long f0 = minor_faults();
        double c0 = now();
        unsigned long sum = 0;
        for (size_t i = 0; i < size; i += PAGE) {
            if (strcmp(work, "write") == 0)
                p[i] = 2;
            else if (strcmp(work, "read") == 0)
                sum += ((volatile char *)p)[i];
        }
        printf("  child %-5s %8.1f ms %8ld minor faults (sum %lu)\n", work, (now() - c0) * 1e3, minor_faults() - f0,
               sum);
        fflush(stdout);
        char c = 'x';
        if (write(ready[1], &c, 1) != 1 || read(go[0], &c, 1) != 1)
            _exit(1);
        _exit(0);
    }
    double fork_ms = (now() - t0) * 1e3;
    char c;
    if (read(ready[0], &c, 1) != 1)
        return 1;
    printf("  fork() in the parent  %8.2f ms\n", fork_ms);
    rollup("parent", getpid());
    rollup("child", pid);
    fflush(stdout);
    if (write(go[1], &c, 1) != 1)
        return 1;
    waitpid(pid, NULL, 0);

    char *spawn_argv[] = {"/bin/true", NULL};
    t0 = now();
    if (posix_spawn(&pid, "/bin/true", NULL, NULL, spawn_argv, environ) != 0)
        return 1;
    double spawn_ms = (now() - t0) * 1e3;
    waitpid(pid, NULL, 0);
    printf("  posix_spawn() returned %8.2f ms\n", spawn_ms);
    return 0;
}
