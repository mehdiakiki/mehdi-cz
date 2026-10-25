#include <fcntl.h>
#include <spawn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/wait.h>
#include <time.h>

extern char **environ;

static int cmp(const void *a, const void *b)
{
    double x = *(const double *)a, y = *(const double *)b;
    return (x > y) - (x < y);
}

static double now_us(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec * 1e6 + t.tv_nsec / 1e3;
}

static double spawn_once(const char *path, posix_spawn_file_actions_t *fa, double *faults)
{
    char *argv[] = {(char *)path, NULL};
    struct rusage ru;
    pid_t pid;
    int status;
    double t0 = now_us();
    if (posix_spawn(&pid, path, fa, NULL, argv, environ) != 0) {
        perror(path);
        exit(1);
    }
    if (wait4(pid, &status, 0, &ru) != pid || !WIFEXITED(status) || WEXITSTATUS(status) != 0) {
        fprintf(stderr, "%s did not exit with status 0\n", path);
        exit(1);
    }
    double t = now_us() - t0;
    *faults = ru.ru_minflt;
    return t;
}

int main(int argc, char **argv)
{
    if (argc < 3) {
        fprintf(stderr, "usage: %s rounds program...\n", argv[0]);
        return 2;
    }
    int rounds = atoi(argv[1]);
    int nprog = argc - 2;
    double *us = malloc(sizeof(double) * rounds * nprog);
    double *flt = malloc(sizeof(double) * rounds * nprog);
    double ignored;
    posix_spawn_file_actions_t fa;
    posix_spawn_file_actions_init(&fa);
    posix_spawn_file_actions_addopen(&fa, 1, "/dev/null", O_WRONLY, 0);

    for (int i = 0; i < 50; i++)
        for (int p = 0; p < nprog; p++)
            spawn_once(argv[2 + p], &fa, &ignored);

    for (int i = 0; i < rounds; i++)
        for (int p = 0; p < nprog; p++)
            us[p * rounds + i] = spawn_once(argv[2 + p], &fa, &flt[p * rounds + i]);

    printf("%-16s %6s %9s %9s %9s %9s %9s %7s\n", "program", "starts", "median", "p10", "p90", "min", "max",
           "faults");
    for (int p = 0; p < nprog; p++) {
        double *v = us + p * rounds, *f = flt + p * rounds;
        qsort(v, rounds, sizeof(double), cmp);
        qsort(f, rounds, sizeof(double), cmp);
        const char *name = strrchr(argv[2 + p], '/');
        printf("%-16s %6d %6.0f us %6.0f us %6.0f us %6.0f us %6.0f us %7.0f\n", name ? name + 1 : argv[2 + p],
               rounds, v[rounds / 2], v[rounds / 10], v[rounds * 9 / 10], v[0], v[rounds - 1], f[rounds / 2]);
    }
    return 0;
}
