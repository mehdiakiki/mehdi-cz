#include <stdio.h>
#include <string.h>
#include <sys/auxv.h>

int main(int argc, char **argv)
{
    char line[256];
    unsigned long start = 0, end = 0;
    FILE *maps = fopen("/proc/self/maps", "r");
    while (maps && fgets(line, sizeof line, maps))
        if (strstr(line, "[vdso]"))
            sscanf(line, "%lx-%lx", &start, &end);
    if (maps)
        fclose(maps);
    printf("[vdso] at 0x%lx-0x%lx, getauxval(AT_SYSINFO_EHDR) = 0x%lx\n", start, end, getauxval(AT_SYSINFO_EHDR));
    FILE *out = fopen(argc > 1 ? argv[1] : "vdso.so", "wb");
    if (!out || !start || fwrite((const void *)start, 1, end - start, out) != end - start)
        return 1;
    fclose(out);
    printf("wrote %lu bytes\n", end - start);
    return 0;
}
