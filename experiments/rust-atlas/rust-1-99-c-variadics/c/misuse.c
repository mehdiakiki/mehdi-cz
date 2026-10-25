#include <stdio.h>
#include <string.h>

#include "varargs.h"

static void print_text(const char *label, char *text) {
    printf("%s = \"%s\"\n", label, text);
    rv_free(text);
}

int main(int argc, char **argv) {
    const char *which = argc > 1 ? argv[1] : "";

    if (strcmp(which, "wrong-type") == 0) {
        print_text("rv_format(\"%d\", 2.5)", rv_format("%d", 2.5));
    } else if (strcmp(which, "short-count") == 0) {
        printf("rv_sum(4, 1, 2, 3) = %ld\n", rv_sum(4, 1, 2, 3));
    } else if (strcmp(which, "no-sentinel") == 0) {
        print_text("rv_join_path(\"usr\", \"local\")", rv_join_path("usr", "local"));
    } else if (strcmp(which, "not-my-format") == 0) {
        print_text("rv_format(\"%ld\", 5L)", rv_format("%ld", 5L));
    } else {
        fprintf(stderr, "usage: misuse wrong-type|short-count|no-sentinel|not-my-format\n");
        return 2;
    }
    return 0;
}
