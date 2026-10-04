#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern uint8_t *rfa_allocate(size_t payload_size);

int main(void) {
    uint8_t *payload = rfa_allocate(32);
    if (payload == NULL) {
        return 2;
    }
    memset(payload, 0x2a, 32);
    fprintf(stderr, "creator=rust destroyer=c-free payload_size=32\n");
    free(payload);
    return 0;
}
