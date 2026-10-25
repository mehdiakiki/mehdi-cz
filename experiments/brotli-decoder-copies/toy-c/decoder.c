#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>

#define OUT_CAP 8

struct decoder {
  const unsigned char *in;
  size_t len;
  size_t pos;
  unsigned char *out;
  size_t written;
};

static bool take_block(struct decoder *d) {
  if (d->pos >= d->len) {
    return false;
  }
  unsigned char types = d->in[d->pos];
  if (types < 2) {
    return false;
  }
  d->pos++;
  return true;
}

static void decode(struct decoder *d) {
  while (d->pos < d->len) {
    if (!take_block(d)) {
      d->out[d->written] = d->in[d->pos];
      d->written++;
      d->pos++;
    }
  }
}

int main(void) {
  unsigned char input[20];
  for (size_t i = 0; i < sizeof input; i++) {
    input[i] = 1;
  }

  struct decoder d;
  d.in = input;
  d.len = sizeof input;
  d.pos = 0;
  d.out = malloc(OUT_CAP);
  d.written = 0;

  decode(&d);

  printf("wrote %zu bytes into an %d byte buffer\n", d.written, OUT_CAP);
  free(d.out);
  return 0;
}
