#include <stdint.h>

_Static_assert(sizeof(uint32_t) == 4, "the boundary requires a four-byte status word");

uint32_t rfa_status(void) {
    return 2u; /* STATUS_STOPPED was added by the newer C producer. */
}
