#include <stdio.h>
#include <stddef.h>

struct mixed { unsigned char a; unsigned int b; unsigned short c; };
struct ordered { unsigned int b; unsigned short c; unsigned char a; };

int main(void) {
    printf("struct mixed   size %zu  align %zu  offsets a=%zu b=%zu c=%zu\n",
        sizeof(struct mixed), _Alignof(struct mixed),
        offsetof(struct mixed, a), offsetof(struct mixed, b), offsetof(struct mixed, c));
    printf("struct ordered size %zu  align %zu  offsets a=%zu b=%zu c=%zu\n",
        sizeof(struct ordered), _Alignof(struct ordered),
        offsetof(struct ordered, a), offsetof(struct ordered, b), offsetof(struct ordered, c));
    return 0;
}
