/* Writes two times to a connection on 127.0.0.1 that the server has already closed.
   usage: p06_sigpipe PORT [ignore] */
#include <arpa/inet.h>
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

int main(int argc, char **argv)
{
    if (argc > 2 && strcmp(argv[2], "ignore") == 0)
        signal(SIGPIPE, SIG_IGN);
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in addr = {.sin_family = AF_INET, .sin_port = htons(atoi(argv[1]))};
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    if (connect(fd, (struct sockaddr *)&addr, sizeof addr) != 0) {
        perror("connect");
        return 1;
    }
    usleep(200000);
    for (int i = 1; i <= 2; i++) {
        ssize_t n = write(fd, "hello", 5);
        if (n < 0)
            printf("write %d returned -1, errno %d (%s)\n", i, errno, strerror(errno));
        else
            printf("write %d returned %zd\n", i, n);
        fflush(stdout);
        usleep(100000);
    }
    close(fd);
    return 0;
}
