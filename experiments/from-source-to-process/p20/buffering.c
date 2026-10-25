#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* Usage: buffering exit|_exit|return line|text */
int main(int argc, char **argv)
{
    const char *end = argc > 1 ? argv[1] : "return";
    const char *what = argc > 2 ? argv[2] : "line";
    if (strcmp(what, "line") == 0)
        printf("a line with a newline\n");
    else
        printf("no newline here");
    if (strcmp(end, "_exit") == 0)
        _exit(0);
    if (strcmp(end, "exit") == 0)
        exit(0);
    return 0;
}
