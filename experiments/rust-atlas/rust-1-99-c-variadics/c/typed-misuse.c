#include <stdio.h>

#include "varargs.h"

int main(void) {
    const double values[] = {2.5, 1.5};
    printf("rv_sum_array(values, 2) = %ld\n", rv_sum_array(values, 2));
    return 0;
}
