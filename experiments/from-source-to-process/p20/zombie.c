#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/file.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define SIZE (64L << 20)

static void *(*volatile fill)(void *, int, size_t) = memset;

static double now_ms(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec * 1e3 + t.tv_nsec / 1e6;
}

/* Prints the state, the resident memory and the number of open file descriptors of a process. */
static void show(pid_t pid, const char *when)
{
    char path[64], line[256], state[64] = "-", rss[64] = "(no VmRSS line)";
    snprintf(path, sizeof path, "/proc/%d/status", pid);
    FILE *f = fopen(path, "r");
    while (f && fgets(line, sizeof line, f)) {
        line[strcspn(line, "\n")] = 0;
        if (strncmp(line, "State:", 6) == 0)
            snprintf(state, sizeof state, "%.60s", line + 7);
        if (strncmp(line, "VmRSS:", 6) == 0)
            snprintf(rss, sizeof rss, "%.60s", line + 7);
    }
    if (f)
        fclose(f);
    snprintf(path, sizeof path, "/proc/%d/fd", pid);
    int fds = 0;
    char command[128];
    snprintf(command, sizeof command, "ls %s 2>/dev/null | wc -l", path);
    FILE *p = popen(command, "r");
    if (p && fscanf(p, "%d", &fds) != 1)
        fds = -1;
    if (p)
        pclose(p);
    printf("%-32s State: %-12s VmRSS: %-14s open fds: %d\n", when, state, rss, fds);
}

static void try_lock(const char *when)
{
    int fd = open("lockfile", O_RDWR);
    int r = flock(fd, LOCK_EX | LOCK_NB);
    printf("%-32s flock(LOCK_EX | LOCK_NB) on lockfile: %s\n", when, r == 0 ? "got the lock" : "busy");
    close(fd);
}

int main(void)
{
    int fds[2];
    pipe(fds);
    close(open("lockfile", O_CREAT | O_RDWR, 0600));
    pid_t child = fork();
    if (child == 0) {
        close(fds[0]);
        char *memory = malloc(SIZE);
        fill(memory, 1, SIZE);
        int fd = open("lockfile", O_RDWR);
        flock(fd, LOCK_EX);
        write(fds[1], "x", 1);
        usleep(300000);
        _exit(7);
    }
    close(fds[1]);
    char c;
    read(fds[0], &c, 1);
    printf("child %d: touched 64 MiB, took a lock, wrote to the pipe, sleeps 300 ms, then calls _exit(7)\n", child);
    show(child, "child alive:");
    try_lock("parent, child alive:");
    double start = now_ms();
    ssize_t n = read(fds[0], &c, 1);
    printf("%-32s read() on the pipe returned %zd after %.0f ms\n", "parent:", n, now_ms() - start);
    siginfo_t info;
    waitid(P_PID, child, &info, WEXITED | WNOWAIT);
    show(child, "child exited, not waited for:");
    try_lock("parent, child exited:");
    fflush(stdout);
    char command[128];
    snprintf(command, sizeof command, "ps -o pid,ppid,stat,comm -p %d", child);
    system(command);
    int status;
    waitpid(child, &status, 0);
    printf("%-32s waitpid: exit status %d\n", "parent:", WEXITSTATUS(status));
    fflush(stdout);
    system(command);
    return 0;
}
