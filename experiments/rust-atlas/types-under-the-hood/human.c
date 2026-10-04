#include <stdio.h>
enum human { MAN, WOMAN };

__attribute__((noinline))
const char *greet(enum human h) {
    if (h == MAN) return "Hello sir";
    return "Hello madam";
}

int main(void) {
    printf("size of enum human: %zu bytes\n", sizeof(enum human));
    printf("%s\n", greet(MAN));
    printf("%s\n", greet(7));
    return 0;
}
