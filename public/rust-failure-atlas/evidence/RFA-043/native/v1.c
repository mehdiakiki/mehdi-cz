#include <stdint.h>
#include <stdlib.h>
#include <string.h>

static const uint32_t OWNER_V1 = 0x56310001u;

void *rfa_native_v1_create(int32_t value) {
    unsigned char *handle = malloc(sizeof(uint32_t) + sizeof(int32_t));
    if (handle == NULL) {
        return NULL;
    }
    memcpy(handle, &OWNER_V1, sizeof(OWNER_V1));
    memcpy(handle + sizeof(OWNER_V1), &value, sizeof(value));
    return handle;
}

int rfa_native_v1_read(const void *handle, int32_t *value) {
    uint32_t owner = 0;
    memcpy(&owner, handle, sizeof(owner));
    if (owner != OWNER_V1) {
        return -1;
    }
    memcpy(value, (const unsigned char *)handle + sizeof(owner), sizeof(*value));
    return 0;
}

void rfa_native_v1_destroy(void *handle) {
    free(handle);
}
