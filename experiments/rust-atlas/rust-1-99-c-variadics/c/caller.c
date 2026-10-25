#include <stdarg.h>
#include <stdio.h>

#include "varargs.h"

static long forward_sum(int count, ...) {
    va_list args;
    va_start(args, count);
    long total = rv_vsum(count, args);
    va_end(args);
    return total;
}

static void print_text(const char *label, char *text) {
    printf("%s = \"%s\"\n", label, text);
    rv_free(text);
}

int main(void) {
    char letter = 'A';
    short small = 7;
    float half = 0.5f;
    const int values[] = {10, 20, 12};

    printf("count:     rv_sum(3, 10, 20, 12) = %ld\n", rv_sum(3, 10, 20, 12));
    printf("promoted:  rv_sum(2, letter, small) = %ld\n", rv_sum(2, letter, small));
    printf("promoted:  rv_mean(3, half, 1.5f, 4.0f) = %f\n", rv_mean(3, half, 1.5f, 4.0f));
    print_text("sentinel:  rv_join_path(\"usr\", \"local\", \"bin\", NULL)",
               rv_join_path("usr", "local", "bin", (char *)NULL));
    print_text("format:    rv_format(\"%s: %d jobs, %u%% done, grade %c, avg %f\", ...)",
               rv_format("%s: %d jobs, %u%% done, grade %c, avg %f", "queue", 3, 75u, letter, half));
    print_text("forwarded: rv_cformat(\"%-6s|%5.2f|%#x\", \"load\", 9.87654, 255)",
               rv_cformat("%-6s|%5.2f|%#x", "load", 9.87654, 255));
    printf("va_list:   forward_sum(4, 1, 2, 3, 4) -> rv_vsum = %ld\n", forward_sum(4, 1, 2, 3, 4));
    printf("typed:     rv_sum_array(values, 3) = %ld\n", rv_sum_array(values, 3));
    return 0;
}
