#define _GNU_SOURCE
#include <dlfcn.h>
#include <fcntl.h>
#include <stdatomic.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

static void *(*real_malloc)(size_t);
static void *(*real_calloc)(size_t, size_t);
static void *(*real_realloc)(void *, size_t);
static void (*real_free)(void *);

static atomic_ulong malloc_calls, calloc_calls, realloc_calls, free_calls;

static int report_fd = 2;
static int resolving;
static _Alignas(16) char arena[8192];
static size_t arena_used;
static unsigned long arena_allocations;

static int from_arena(const void *p)
{
    return (const char *)p >= arena && (const char *)p < arena + sizeof arena;
}

static void *arena_alloc(size_t size)
{
    size = (size + 15) & ~(size_t)15;
    if (size > sizeof arena - arena_used)
        return NULL;
    void *p = arena + arena_used;
    arena_used += size;
    arena_allocations++;
    return p;
}

static void resolve(void)
{
    resolving = 1;
    real_malloc = dlsym(RTLD_NEXT, "malloc");
    real_calloc = dlsym(RTLD_NEXT, "calloc");
    real_realloc = dlsym(RTLD_NEXT, "realloc");
    real_free = dlsym(RTLD_NEXT, "free");
    resolving = 0;
}

void *malloc(size_t size)
{
    if (!real_malloc) {
        if (resolving)
            return arena_alloc(size);
        resolve();
    }
    atomic_fetch_add_explicit(&malloc_calls, 1, memory_order_relaxed);
    return real_malloc(size);
}

void *calloc(size_t n, size_t size)
{
    if (!real_calloc) {
        if (resolving)
            return size && n > sizeof arena / size ? NULL : arena_alloc(n * size);
        resolve();
    }
    atomic_fetch_add_explicit(&calloc_calls, 1, memory_order_relaxed);
    return real_calloc(n, size);
}

void *realloc(void *p, size_t size)
{
    if (from_arena(p)) {
        size_t available = (size_t)(arena + sizeof arena - (char *)p);
        void *q = malloc(size);
        if (q)
            memcpy(q, p, size < available ? size : available);
        return q;
    }
    if (!real_realloc)
        resolve();
    atomic_fetch_add_explicit(&realloc_calls, 1, memory_order_relaxed);
    return real_realloc(p, size);
}

void free(void *p)
{
    if (p == NULL || from_arena(p))
        return;
    if (!real_free)
        resolve();
    atomic_fetch_add_explicit(&free_calls, 1, memory_order_relaxed);
    real_free(p);
}

__attribute__((constructor)) static void start(void)
{
    int fd = fcntl(2, F_DUPFD_CLOEXEC, 100);
    if (fd >= 0)
        report_fd = fd;
    if (!real_malloc)
        resolve();
}

__attribute__((destructor)) static void report(void)
{
    char line[160];
    int n = snprintf(line, sizeof line, "[libcount] malloc %lu, calloc %lu, realloc %lu, free %lu, early allocations %lu\n",
                     atomic_load(&malloc_calls), atomic_load(&calloc_calls), atomic_load(&realloc_calls),
                     atomic_load(&free_calls), arena_allocations);
    if (n > 0)
        write(report_fd, line, (size_t)n);
}
