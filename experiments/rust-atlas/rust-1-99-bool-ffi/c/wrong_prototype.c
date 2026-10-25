#include <stdio.h>

extern int rust_fn_returning_bool_u32(unsigned int word);

int main(void) {
    static const unsigned int inputs[] = {0x00000000, 0x00000001, 0x12345600, 0x12345601};

    for (unsigned i = 0; i < sizeof inputs / sizeof inputs[0]; i++) {
        int ret = rust_fn_returning_bool_u32(inputs[i]);
        printf("word=0x%08x ret=%d ret==1:%s\n", inputs[i], ret, ret == 1 ? "yes" : "no");
    }
    return 0;
}
