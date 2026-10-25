#include <stdbool.h>
#include <stdio.h>

extern bool rust_fn_returning_bool(unsigned char flags);

/* Declares rust_fn_returning_bool a second time, under another C name, with an unsigned char return. */
extern unsigned char rust_fn_returning_bool_byte(unsigned char flags) __asm__("rust_fn_returning_bool");

int main(void) {
    static const unsigned char inputs[] = {0x00, 0x01, 0x10, 0x11};

    for (unsigned i = 0; i < sizeof inputs; i++) {
        bool ret = rust_fn_returning_bool(inputs[i]);
        unsigned char byte = rust_fn_returning_bool_byte(inputs[i]);
        printf("flags=0x%02x al=0x%02x ret=%d\n", inputs[i], byte, (int)ret);
    }
    return 0;
}
