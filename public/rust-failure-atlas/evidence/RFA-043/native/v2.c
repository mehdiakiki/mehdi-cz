#include <stdint.h>
#include <string.h>

static const uint32_t OWNER_V2 = 0x56320002u;

int rfa_native_v2_read(const void *handle, int32_t *value) {
    uint32_t owner = 0;
    memcpy(&owner, handle, sizeof(owner));
    if (owner != OWNER_V2) {
        return -1;
    }
    memcpy(value, (const unsigned char *)handle + sizeof(owner), sizeof(*value));
    return 0;
}
