#include <stdint.h>
#include <stdio.h>
#include <string.h>

extern uint8_t *rfa_allocate(size_t payload_size);
extern int32_t rfa_deallocate(uint8_t *payload);

int main(void) {
    uint8_t *payload = rfa_allocate(32);
    if (payload == NULL) {
        return 2;
    }
    memset(payload, 0x2a, 32);
    fprintf(stderr, "creator=rust destroyer=rust payload_size=32\n");
    return rfa_deallocate(payload) == 0 ? 0 : 3;
}
