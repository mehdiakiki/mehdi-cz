#define _GNU_SOURCE
#include <dlfcn.h>
#include <stddef.h>
#include <unistd.h>

static void *(*real_malloc)(size_t);
static unsigned long depth_max, depth;

void *malloc(size_t n)
{
    depth++;
    if (depth > depth_max)
        depth_max = depth;
    if (!real_malloc)
        real_malloc = dlsym(RTLD_NEXT, "malloc");
    void *p = real_malloc(n);
    depth--;
    return p;
}

__attribute__((destructor)) static void report(void)
{
    char msg[] = "naive wrapper: max depth X\n";
    msg[25] = '0' + (depth_max > 9 ? 9 : depth_max);
    write(2, msg, sizeof msg - 1);
}
