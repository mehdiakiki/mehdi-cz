#include <cstdio>
#include <cstdlib>
#include <string>
#include <vector>

#include "deorummolae.h"
#include "durchschlag.h"

namespace {

[[noreturn]] void unavailable(const char* engine) {
  std::fprintf(stderr,
      "%s was intentionally not linked; PERF-054 is locked to --sieve\n",
      engine);
  std::abort();
}

}  // namespace

std::string DM_generate(size_t, const std::vector<size_t>&, const uint8_t*) {
  unavailable("deorummolae");
}

std::string durchschlag_generate(
    size_t, size_t, size_t, const std::vector<size_t>&, const uint8_t*) {
  unavailable("durchschlag");
}

void durchschlag_distill(
    size_t, size_t, std::vector<size_t>*, uint8_t*) {
  unavailable("durchschlag distill");
}

void durchschlag_purify(
    size_t, size_t, const std::vector<size_t>&, uint8_t*) {
  unavailable("durchschlag purify");
}
