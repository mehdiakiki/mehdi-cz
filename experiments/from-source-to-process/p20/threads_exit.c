#include <pthread.h>
#include <stdlib.h>
#include <unistd.h>

static void *sleeper(void *arg)
{
    (void)arg;
    for (;;)
        pause();
    return NULL;
}

/* The main thread calls exit while a second thread is still waiting in pause(). */
int main(void)
{
    pthread_t thread;
    pthread_create(&thread, NULL, sleeper, NULL);
    usleep(100000);
    exit(5);
}
