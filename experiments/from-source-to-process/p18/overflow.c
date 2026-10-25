#define _GNU_SOURCE
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <unistd.h>

static volatile long depth;
static volatile unsigned long first_frame, second_frame, stack_top;

static void on_segv(int sig, siginfo_t *info, void *context)
{
    (void)context;
    char line[256];
    unsigned long fault = (unsigned long)info->si_addr;
    int n = snprintf(line, sizeof line,
                     "SIGSEGV at depth %ld, frame %lu bytes, fault address 0x%lx, %lu bytes below the top of the stack\n",
                     depth, first_frame - second_frame, fault, stack_top - fault);
    if (n > 0)
        write(2, line, (size_t)n);
    signal(sig, SIG_DFL);
    raise(sig);
}

__attribute__((noinline)) static long recurse(long level)
{
    volatile char buffer[1000];
    buffer[0] = (char)level;
    depth = level;
    if (level == 1)
        first_frame = (unsigned long)buffer;
    if (level == 2)
        second_frame = (unsigned long)buffer;
    return recurse(level + 1) + buffer[0];
}

static unsigned long find_stack_top(void)
{
    char line[256];
    unsigned long start = 0, end = 0;
    FILE *maps = fopen("/proc/self/maps", "r");
    while (maps && fgets(line, sizeof line, maps))
        if (strstr(line, "[stack]"))
            sscanf(line, "%lx-%lx", &start, &end);
    if (maps)
        fclose(maps);
    return end;
}

int main(int argc, char **argv)
{
    struct rlimit limit;
    getrlimit(RLIMIT_STACK, &limit);
    printf("RLIMIT_STACK soft limit: %lu bytes\n", (unsigned long)limit.rlim_cur);
    fflush(stdout);
    stack_top = find_stack_top();
    if (argc > 1 && strcmp(argv[1], "report") == 0) {
        static char alternate[64 * 1024];
        stack_t ss = {.ss_sp = alternate, .ss_size = sizeof alternate};
        struct sigaction sa = {.sa_sigaction = on_segv, .sa_flags = SA_SIGINFO | SA_ONSTACK};
        sigaltstack(&ss, NULL);
        sigaction(SIGSEGV, &sa, NULL);
    }
    if (argc > 1 && strcmp(argv[1], "report-no-altstack") == 0) {
        struct sigaction sa = {.sa_sigaction = on_segv, .sa_flags = SA_SIGINFO};
        sigaction(SIGSEGV, &sa, NULL);
    }
    return (int)recurse(1);
}
