#define _GNU_SOURCE
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

static int children_use_exit;

/* Starts a child that ends in a given way and prints the status that wait gives the parent. */
static void run(const char *what, int code, int sig)
{
    pid_t child = fork();
    if (child == 0) {
        if (sig)
            kill(getpid(), sig);
        if (children_use_exit)
            exit(code);
        _exit(code);
    }
    int status;
    waitpid(child, &status, 0);
    printf("%-26s raw status 0x%04x: ", what, status);
    if (WIFEXITED(status))
        printf("exited, exit status %d\n", WEXITSTATUS(status));
    else if (WIFSIGNALED(status))
        printf("killed by signal %d (%s)\n", WTERMSIG(status), strsignal(WTERMSIG(status)));
}

/* Usage: codes exit|_exit, the function that the children call to end. */
int main(int argc, char **argv)
{
    children_use_exit = argc > 1 && strcmp(argv[1], "exit") == 0;
    run("exit code 3", 3, 0);
    run("exit code 300", 300, 0);
    run("kill(getpid(), SIGTERM)", 0, SIGTERM);
    run("kill(getpid(), SIGKILL)", 0, SIGKILL);
    return 0;
}
