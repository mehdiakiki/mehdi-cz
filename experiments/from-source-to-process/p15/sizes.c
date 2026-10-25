#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void say(const char *format, const void *p, const char *name)
{
    char line[96];
    int n = snprintf(line, sizeof line, format, name, p);
    if (n > 0)
        write(1, line, (size_t)n);
}

int main(int argc, char **argv)
{
    if (argc > 1) {
        say("malloc(%s KiB) as the first allocation\n", NULL, argv[1]);
        void *p = malloc((size_t)atoi(argv[1]) << 10);
        say("  %s KiB at %p\n", p, argv[1]);
        return 0;
    }
    static const size_t sizes[] = {16, 1 << 10, 64 << 10, 127 << 10, 129 << 10, 1 << 20, 64 << 20};
    static const char *names[] = {"16 B", "1 KiB", "64 KiB", "127 KiB", "129 KiB", "1 MiB", "64 MiB"};
    void *blocks[7];
    for (int i = 0; i < 7; i++) {
        say("malloc(%s)\n", NULL, names[i]);
        blocks[i] = malloc(sizes[i]);
        say("  %s at %p\n", blocks[i], names[i]);
    }
    say("free(%s)\n", NULL, "1 MiB");
    free(blocks[5]);
    say("malloc(%s) again\n", NULL, "1 MiB");
    void *again = malloc(1 << 20);
    say("  %s at %p\n", again, "1 MiB");
    say("malloc(%s) again\n", NULL, "129 KiB");
    void *small_again = malloc(129 << 10);
    say("  %s at %p\n", small_again, "129 KiB");
    return 0;
}
