#include <stdint.h>
#include <stdio.h>

extern uint8_t rust_fn_returning_u8(uint8_t flags);

int main(void) {
    static const uint8_t inputs[] = {0x00, 0x01, 0x10, 0x11};

    for (unsigned i = 0; i < sizeof inputs; i++) {
        uint8_t ret = rust_fn_returning_u8(inputs[i]);
        printf("flags=0x%02x ret=%d", inputs[i], ret);
        if (ret != 0) {
            printf(" if=true");
        } else {
            printf(" if=false");
        }
        printf(" !ret=%d\n", !ret);
    }
    return 0;
}
