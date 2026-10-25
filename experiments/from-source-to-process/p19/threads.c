#define _GNU_SOURCE
#include <pthread.h>
#include <stdio.h>

_Thread_local long counter = 42;
_Thread_local char scratch[4096];

static char lines[4][160];
static pthread_barrier_t all_alive;

static char *thread_pointer(void)
{
    char *tp;
    __asm__("mov %%fs:0, %0" : "=r"(tp));
    return tp;
}

__attribute__((noipa)) long bump(void)
{
    return ++counter;
}

static void report(char *line, const char *who)
{
    char *tp = thread_pointer();
    snprintf(line, sizeof lines[0], "%-8s fs %p, &counter %p = fs - %ld, &scratch %p, counter %ld",
             who, (void *)tp, (void *)&counter, (long)(tp - (char *)&counter), (void *)scratch, counter);
}

static void *worker(void *arg)
{
    long n = (long)arg;
    char name[16];
    for (long i = 0; i < n; i++)
        bump();
    snprintf(name, sizeof name, "thread %ld", n);
    report(lines[n], name);
    pthread_barrier_wait(&all_alive);
    return NULL;
}

int main(void)
{
    pthread_t threads[3];
    pthread_barrier_init(&all_alive, NULL, 3);
    for (long i = 0; i < 3; i++)
        pthread_create(&threads[i], NULL, worker, (void *)(i + 1));
    for (int i = 0; i < 3; i++)
        pthread_join(threads[i], NULL);
    report(lines[0], "main");
    for (int i = 0; i < 4; i++)
        puts(lines[i]);
    return 0;
}
