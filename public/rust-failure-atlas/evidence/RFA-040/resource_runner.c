#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <sys/resource.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "usage: resource_runner LIMIT_KIB COMMAND [ARG...]\n");
        return 2;
    }

    unsigned long long limit_kib = strtoull(argv[1], NULL, 10);
    pid_t child = fork();
    if (child < 0) {
        perror("fork");
        return 2;
    }
    if (child == 0) {
        struct rlimit limit = {limit_kib * 1024, limit_kib * 1024};
        if (setrlimit(RLIMIT_AS, &limit) != 0) {
            perror("setrlimit");
            _exit(126);
        }
        execvp(argv[2], &argv[2]);
        perror("execvp");
        _exit(127);
    }

    int status = 0;
    struct rusage usage;
    if (wait4(child, &status, 0, &usage) < 0) {
        perror("wait4");
        return 2;
    }
    if (WIFEXITED(status)) {
        printf(
            "limit_kib=%llu exit_code=%d signal=0 peak_rss_kib=%ld\n",
            limit_kib,
            WEXITSTATUS(status),
            usage.ru_maxrss
        );
        return WEXITSTATUS(status);
    }
    if (WIFSIGNALED(status)) {
        printf(
            "limit_kib=%llu exit_code=-1 signal=%d peak_rss_kib=%ld\n",
            limit_kib,
            WTERMSIG(status),
            usage.ru_maxrss
        );
        return 128 + WTERMSIG(status);
    }
    return 2;
}
