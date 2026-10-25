#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int counter = 1;

static void print_file(const char *path)
{
    char line[512];
    FILE *f = fopen(path, "r");
    while (f && fgets(line, sizeof line, f))
        fputs(line, stdout);
    if (f)
        fclose(f);
}

static void print_smaps_entry(unsigned long address)
{
    char line[512];
    int inside = 0;
    FILE *f = fopen("/proc/self/smaps", "r");
    while (f && fgets(line, sizeof line, f)) {
        unsigned long start, end;
        if (sscanf(line, "%lx-%lx ", &start, &end) == 2)
            inside = start <= address && address < end;
        if (inside)
            fputs(line, stdout);
    }
    if (f)
        fclose(f);
}

int main(int argc, char **argv)
{
    int local = 0;
    char *small = malloc(100);
    char *large = malloc(1 << 20);

    printf("main %p, counter %p, small %p, large %p, local %p, puts %p\n", (void *)main, (void *)&counter,
           (void *)small, (void *)large, (void *)&local, (void *)puts);
    fflush(stdout);
    if (argc > 1 && strcmp(argv[1], "smaps") == 0)
        print_smaps_entry((unsigned long)puts);
    else
        print_file("/proc/self/maps");
    free(large);
    free(small);
    return 0;
}
