long loop(const long *a, long n)
{
    long s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    for (long i = 0; i < n; i++) {
        long x = a[i];
        s1 += x;
        s2 ^= x * 3;
        s3 += x >> 2;
        s4 -= x;
    }
    return s1 + s2 + s3 + s4;
}
