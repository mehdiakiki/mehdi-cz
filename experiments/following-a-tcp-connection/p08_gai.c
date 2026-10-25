/* Calls getaddrinfo() for names that are answered on this machine.
   usage: p08_gai show NAME...         prints the answers in the order getaddrinfo returns them
          p08_gai time COUNT NAME...   times the first call and COUNT more calls for each name
   The name @hostname means the name of this machine, printed as "the hostname". */
#include <arpa/inet.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

static char host[256];

static const char *real_name(const char *name)
{
    if (strcmp(name, "@hostname") != 0)
        return name;
    gethostname(host, sizeof host);
    return host;
}

static const char *label(const char *name)
{
    return strcmp(name, "@hostname") == 0 ? "the hostname" : name;
}

static double now_us(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1e6 + ts.tv_nsec / 1e3;
}

static int resolve(const char *name, struct addrinfo **res)
{
    struct addrinfo hints = {.ai_family = AF_UNSPEC, .ai_socktype = SOCK_STREAM};
    return getaddrinfo(real_name(name), "21080", &hints, res);
}

static void show(const char *name)
{
    struct addrinfo *res;
    int err = resolve(name, &res);
    if (err != 0) {
        printf("%s: %s\n", label(name), gai_strerror(err));
        return;
    }
    printf("%s:", label(name));
    for (struct addrinfo *ai = res; ai; ai = ai->ai_next) {
        char text[INET6_ADDRSTRLEN];
        void *addr = ai->ai_family == AF_INET6
            ? (void *)&((struct sockaddr_in6 *)ai->ai_addr)->sin6_addr
            : (void *)&((struct sockaddr_in *)ai->ai_addr)->sin_addr;
        inet_ntop(ai->ai_family, addr, text, sizeof text);
        printf(" %s", text);
    }
    printf("\n");
    freeaddrinfo(res);
}

static int cmp(const void *a, const void *b)
{
    double x = *(const double *)a, y = *(const double *)b;
    return (x > y) - (x < y);
}

static void time_name(const char *name, int count)
{
    struct addrinfo *res;
    double *t = malloc(sizeof(double) * count);
    double t0 = now_us();
    resolve(name, &res);
    double first = now_us() - t0;
    freeaddrinfo(res);
    for (int i = 0; i < count; i++) {
        t0 = now_us();
        resolve(name, &res);
        t[i] = now_us() - t0;
        freeaddrinfo(res);
    }
    qsort(t, count, sizeof(double), cmp);
    printf("%-22s first call %8.1f us, then %d calls: median %6.1f us, p99 %6.1f us, max %7.1f us\n",
           label(name), first, count, t[count / 2], t[count * 99 / 100], t[count - 1]);
    free(t);
}

int main(int argc, char **argv)
{
    if (argc > 2 && strcmp(argv[1], "show") == 0) {
        for (int i = 2; i < argc; i++)
            show(argv[i]);
    } else if (argc > 3 && strcmp(argv[1], "time") == 0) {
        for (int i = 3; i < argc; i++)
            time_name(argv[i], atoi(argv[2]));
    } else {
        fprintf(stderr, "usage: p08_gai show NAME... | p08_gai time COUNT NAME...\n");
        return 2;
    }
    return 0;
}
