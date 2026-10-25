#define _GNU_SOURCE
#include <dlfcn.h>
#include <stddef.h>
#include <unistd.h>

static void *(*real_calloc)(size_t, size_t);
static unsigned long depth_max, depth;

void *calloc(size_t n, size_t size)
{
    depth++;
    if (depth > depth_max)
        depth_max = depth;
    if (!real_calloc)
        real_calloc = dlsym(RTLD_NEXT, "calloc");
    void *p = real_calloc(n, size);
    depth--;
    return p;
}

__attribute__((destructor)) static void report(void)
{
    char msg[] = "naive calloc wrapper: max depth X\n";
    msg[32] = '0' + (depth_max > 9 ? 9 : depth_max);
    write(2, msg, sizeof msg - 1);
}
