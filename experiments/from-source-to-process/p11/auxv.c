#include <elf.h>
#include <stdio.h>
#include <string.h>
#include <sys/auxv.h>

static const char *name(unsigned long type)
{
#define NAME(x) \
    case x:     \
        return #x;
    switch (type) {
        NAME(AT_NULL) NAME(AT_PHDR) NAME(AT_PHENT) NAME(AT_PHNUM) NAME(AT_PAGESZ) NAME(AT_BASE)
        NAME(AT_FLAGS) NAME(AT_ENTRY) NAME(AT_UID) NAME(AT_EUID) NAME(AT_GID) NAME(AT_EGID)
        NAME(AT_PLATFORM) NAME(AT_HWCAP) NAME(AT_CLKTCK) NAME(AT_SECURE) NAME(AT_RANDOM)
        NAME(AT_HWCAP2) NAME(AT_RSEQ_FEATURE_SIZE) NAME(AT_RSEQ_ALIGN) NAME(AT_HWCAP3)
        NAME(AT_HWCAP4) NAME(AT_EXECFN) NAME(AT_SYSINFO_EHDR) NAME(AT_MINSIGSTKSZ)
    }
#undef NAME
    return "(unknown)";
}

static void print_stack_mapping(void)
{
    char line[256];
    FILE *maps = fopen("/proc/self/maps", "r");
    while (maps && fgets(line, sizeof line, maps))
        if (strstr(line, "[stack]"))
            printf("the [stack] line of /proc/self/maps: %s", line);
    if (maps)
        fclose(maps);
}

int main(int argc, char **argv, char **envp)
{
    char **end = envp;
    while (*end)
        end++;
    Elf64_auxv_t *auxv = (Elf64_auxv_t *)(end + 1);
    int local = 0;

    printf("the initial stack, from low to high addresses:\n");
    printf("  %p  argc = %ld\n", (void *)(argv - 1), *(long *)(argv - 1));
    printf("  %p  argv[0] .. argv[%d], then NULL\n", (void *)argv, argc - 1);
    printf("  %p  envp[0] .. envp[%td], then NULL\n", (void *)envp, end - envp - 1);
    printf("  %p  auxv, pairs of (type, value):\n", (void *)auxv);
    for (Elf64_auxv_t *a = auxv;; a++) {
        printf("        %-22s 0x%lx", name(a->a_type), (unsigned long)a->a_un.a_val);
        if (a->a_type == AT_EXECFN || a->a_type == AT_PLATFORM)
            printf("  \"%s\"", (const char *)a->a_un.a_val);
        printf("\n");
        if (a->a_type == AT_NULL)
            break;
    }
    printf("the strings and bytes they point to:\n");
    printf("  %p  argv[0] = \"%s\"\n", (void *)argv[0], argv[0]);
    for (char **e = envp; *e; e++)
        printf("  %p  \"%s\"\n", (void *)*e, *e);
    printf("  %p  AT_RANDOM, 16 random bytes\n", (void *)getauxval(AT_RANDOM));
    printf("  %p  AT_EXECFN = \"%s\"\n", (void *)getauxval(AT_EXECFN), (const char *)getauxval(AT_EXECFN));
    printf("  %p  AT_PLATFORM = \"%s\"\n", (void *)getauxval(AT_PLATFORM), (const char *)getauxval(AT_PLATFORM));
    printf("a local variable of main: %p\n", (void *)&local);
    printf("getauxval(AT_PAGESZ) = %lu\n", getauxval(AT_PAGESZ));
    print_stack_mapping();
    return 0;
}
