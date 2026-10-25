// A small picture of the PHP2Shell shape: memory from one request is read
// again after it was given back. This file only demonstrates the bug class.
// It is not an exploit and it does nothing to PHP.
// Build and run: gcc -fsanitize=address -g use_after_free.c -o uaf && ./uaf
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Pretend this holds the state of one web request.
struct request {
  char user[16];
};

int main(void) {
  struct request *first = malloc(sizeof *first);
  strcpy(first->user, "alice");
  free(first);

  // A later step reuses the old pointer by mistake. This is the bug.
  printf("user still reads as: %s\n", first->user);
  return 0;
}
