#define _GNU_SOURCE
#include <dlfcn.h>
#include <limits.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>

typedef uint32_t (*version_fn)(void);
typedef const char *(*error_string_fn)(int);

static void *open_library(const char *dir, const char *name, int flags) {
  char path[PATH_MAX];
  snprintf(path, sizeof path, "%s/%s", dir, name);
  void *handle = dlopen(path, flags);
  if (!handle) {
    fprintf(stderr, "%s\n", dlerror());
    exit(1);
  }
  return handle;
}

int main(int argc, char **argv) {
  if (argc != 2) {
    fprintf(stderr, "usage: %s LIBDIR\n", argv[0]);
    return 2;
  }
  open_library(argv[1], "libbrotlicommon.so.1", RTLD_NOW | RTLD_GLOBAL);
  void *decoder = open_library(argv[1], "libbrotlidec.so.1", RTLD_NOW);

  version_fn version = (version_fn)dlsym(decoder, "BrotliDecoderVersion");
  error_string_fn error_string = (error_string_fn)dlsym(decoder, "BrotliDecoderErrorString");
  if (!version || !error_string) {
    fprintf(stderr, "missing symbol: %s\n", dlerror());
    return 1;
  }

  Dl_info info;
  char loaded[PATH_MAX];
  if (!dladdr((void *)error_string, &info) || !realpath(info.dli_fname, loaded)) {
    fprintf(stderr, "cannot find the loaded file\n");
    return 1;
  }

  uint32_t v = version();
  printf("loaded file:   %s\n", loaded);
  printf("version:       %u.%u.%u\n", v >> 24, (v >> 12) & 0xfff, v & 0xfff);
  for (int code = -16; code >= -18; code--) {
    printf("error %d:     %s\n", code, error_string(code));
  }
  return 0;
}
