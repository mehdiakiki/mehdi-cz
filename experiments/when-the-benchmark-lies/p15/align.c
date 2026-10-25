#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define N 1024
#define CALLS 200
#define ROUNDS 21

typedef long (*loop_fn)(const long *, long);

#define LOOP(name, pad)                                                          \
    __attribute__((noinline, aligned(64))) static long name(const long *a, long n) \
    {                                                                            \
        const long *p = a, *end = a + n;                                         \
        long s1 = 0, s2 = 0, s3 = 0, s4 = 0;                                     \
        __asm__ volatile(".nops " #pad "\n"                                      \
                         "1:\n\t"                                                \
                         "movq (%[p]), %%rax\n\t"                                \
                         "addq $8, %[p]\n\t"                                     \
                         "leaq (%%rax,%%rax,2), %%r9\n\t"                        \
                         "addq %%rax, %[s1]\n\t"                                 \
                         "subq %%rax, %[s4]\n\t"                                 \
                         "xorq %%r9, %[s2]\n\t"                                  \
                         "movq %%rax, %%r9\n\t"                                  \
                         "sarq $2, %%r9\n\t"                                     \
                         "addq %%r9, %[s3]\n\t"                                  \
                         "cmpq %[p], %[end]\n\t"                                 \
                         "jne 1b"                                                \
                         : [p] "+r"(p), [s1] "+r"(s1), [s2] "+r"(s2), [s3] "+r"(s3), [s4] "+r"(s4) \
                         : [end] "r"(end)                                        \
                         : "rax", "r9", "cc", "memory");                         \
        return s1 + s2 + s3 + s4;                                                \
    }

LOOP(a0, 0)
LOOP(b0, 0)
LOOP(a1, 1)
LOOP(b1, 1)
LOOP(a2, 2)
LOOP(b2, 2)
LOOP(a3, 3)
LOOP(b3, 3)
LOOP(a4, 4)
LOOP(b4, 4)
LOOP(a5, 5)
LOOP(b5, 5)
LOOP(a6, 6)
LOOP(b6, 6)
LOOP(a7, 7)
LOOP(b7, 7)
LOOP(a8, 8)
LOOP(b8, 8)
LOOP(a9, 9)
LOOP(b9, 9)
LOOP(a10, 10)
LOOP(b10, 10)
LOOP(a11, 11)
LOOP(b11, 11)
LOOP(a12, 12)
LOOP(b12, 12)
LOOP(a13, 13)
LOOP(b13, 13)
LOOP(a14, 14)
LOOP(b14, 14)
LOOP(a15, 15)
LOOP(b15, 15)
LOOP(a16, 16)
LOOP(b16, 16)
LOOP(a17, 17)
LOOP(b17, 17)
LOOP(a18, 18)
LOOP(b18, 18)
LOOP(a19, 19)
LOOP(b19, 19)
LOOP(a20, 20)
LOOP(b20, 20)
LOOP(a21, 21)
LOOP(b21, 21)
LOOP(a22, 22)
LOOP(b22, 22)
LOOP(a23, 23)
LOOP(b23, 23)
LOOP(a24, 24)
LOOP(b24, 24)
LOOP(a25, 25)
LOOP(b25, 25)
LOOP(a26, 26)
LOOP(b26, 26)
LOOP(a27, 27)
LOOP(b27, 27)
LOOP(a28, 28)
LOOP(b28, 28)
LOOP(a29, 29)
LOOP(b29, 29)
LOOP(a30, 30)
LOOP(b30, 30)
LOOP(a31, 31)
LOOP(b31, 31)
LOOP(a32, 32)
LOOP(b32, 32)
LOOP(a33, 33)
LOOP(b33, 33)
LOOP(a34, 34)
LOOP(b34, 34)
LOOP(a35, 35)
LOOP(b35, 35)
LOOP(a36, 36)
LOOP(b36, 36)
LOOP(a37, 37)
LOOP(b37, 37)
LOOP(a38, 38)
LOOP(b38, 38)
LOOP(a39, 39)
LOOP(b39, 39)
LOOP(a40, 40)
LOOP(b40, 40)
LOOP(a41, 41)
LOOP(b41, 41)
LOOP(a42, 42)
LOOP(b42, 42)
LOOP(a43, 43)
LOOP(b43, 43)
LOOP(a44, 44)
LOOP(b44, 44)
LOOP(a45, 45)
LOOP(b45, 45)
LOOP(a46, 46)
LOOP(b46, 46)
LOOP(a47, 47)
LOOP(b47, 47)
LOOP(a48, 48)
LOOP(b48, 48)
LOOP(a49, 49)
LOOP(b49, 49)
LOOP(a50, 50)
LOOP(b50, 50)
LOOP(a51, 51)
LOOP(b51, 51)
LOOP(a52, 52)
LOOP(b52, 52)
LOOP(a53, 53)
LOOP(b53, 53)
LOOP(a54, 54)
LOOP(b54, 54)
LOOP(a55, 55)
LOOP(b55, 55)
LOOP(a56, 56)
LOOP(b56, 56)
LOOP(a57, 57)
LOOP(b57, 57)
LOOP(a58, 58)
LOOP(b58, 58)
LOOP(a59, 59)
LOOP(b59, 59)
LOOP(a60, 60)
LOOP(b60, 60)
LOOP(a61, 61)
LOOP(b61, 61)
LOOP(a62, 62)
LOOP(b62, 62)
LOOP(a63, 63)
LOOP(b63, 63)

static const loop_fn fns[128] = {
    a0, b0, a1, b1, a2, b2, a3, b3, a4, b4, a5, b5, a6, b6, a7, b7, a8, b8, a9, b9, a10, b10, a11, b11, a12, b12, a13, b13, a14, b14, a15, b15, a16, b16, a17, b17, a18, b18, a19, b19, a20, b20, a21, b21, a22, b22, a23, b23, a24, b24, a25, b25, a26, b26, a27, b27, a28, b28, a29, b29, a30, b30, a31, b31, a32, b32, a33, b33, a34, b34, a35, b35, a36, b36, a37, b37, a38, b38, a39, b39, a40, b40, a41, b41, a42, b42, a43, b43, a44, b44, a45, b45, a46, b46, a47, b47, a48, b48, a49, b49, a50, b50, a51, b51, a52, b52, a53, b53, a54, b54, a55, b55, a56, b56, a57, b57, a58, b58, a59, b59, a60, b60, a61, b61, a62, b62, a63, b63,
};

static long data[N];

static long long now_ns(void)
{
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec * 1000000000LL + t.tv_nsec;
}

static int cmp(const void *x, const void *y)
{
    double a = *(const double *)x, b = *(const double *)y;
    return (a > b) - (a < b);
}

int main(void)
{
    static double ns[128][ROUNDS];
    int order[128];
    unsigned long long rng = 12345;
    long sink = 0;
    for (int i = 0; i < N; i++)
        data[i] = i * 7 + 1;
    for (int k = 0; k < 128; k++)
        order[k] = k;
    for (int r = 0; r < ROUNDS; r++) {
        for (int k = 127; k > 0; k--) {
            rng = rng * 6364136223846793005ULL + 1442695040888963407ULL;
            int j = (int)((rng >> 33) % (unsigned long long)(k + 1));
            int t = order[k];
            order[k] = order[j];
            order[j] = t;
        }
        for (int k = 0; k < 128; k++) {
            int f = order[k];
            long long start = now_ns();
            for (int c = 0; c < CALLS; c++)
                sink += fns[f](data, N);
            ns[f][r] = (double)(now_ns() - start) / ((double)CALLS * N);
        }
    }
    printf("pad  copy a  copy b   (median ns per element over %d rounds)\n", ROUNDS);
    for (int p = 0; p < 64; p++) {
        double m[2];
        for (int c = 0; c < 2; c++) {
            qsort(ns[2 * p + c], ROUNDS, sizeof(double), cmp);
            m[c] = ns[2 * p + c][ROUNDS / 2];
        }
        printf("%3d  %.4f  %.4f  %p %p\n", p, m[0], m[1], (void *)fns[2 * p], (void *)fns[2 * p + 1]);
    }
    printf("sink %ld\n", sink);
    return 0;
}
