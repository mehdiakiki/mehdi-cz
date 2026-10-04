#include <stdint.h>
#include <stdio.h>

extern int32_t plugin_initialize(void);

int main(void) {
    int32_t status = plugin_initialize();
    printf("foreign host observed status %d\n", status);
    return status == 39 ? 0 : 1;
}
