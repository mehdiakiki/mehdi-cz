#include <stdio.h>
#include "widget.h"

int main(void) {
    int runtime_version = widget_runtime_version();
    printf("header_version=%d runtime_version=%d\n", WIDGET_HEADER_VERSION, runtime_version);
    return WIDGET_HEADER_VERSION == runtime_version ? 0 : 1;
}
