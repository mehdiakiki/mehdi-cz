#!/usr/bin/env bash

set -euo pipefail

readonly EXPECTED_COMMIT="09e1ac6c7eea9d3b53f85bcdde6347358dbe1281"
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly EXPERIMENT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly SOURCE_DIR="${1:?usage: build-generator.sh /path/to/google-brotli-checkout}"
readonly ACTUAL_COMMIT="$(git -C "${SOURCE_DIR}" rev-parse HEAD)"

if [[ "${ACTUAL_COMMIT}" != "${EXPECTED_COMMIT}" ]]; then
  echo "expected Brotli ${EXPECTED_COMMIT}, got ${ACTUAL_COMMIT}" >&2
  exit 1
fi

mkdir -p "${EXPERIMENT_DIR}/tools"

g++ \
  -std=c++17 \
  -O3 \
  -DNDEBUG \
  -I "${SOURCE_DIR}/research" \
  "${SOURCE_DIR}/research/dictionary_generator.cc" \
  "${SOURCE_DIR}/research/sieve.cc" \
  "${SCRIPT_DIR}/unused-generator-engine-stubs.cc" \
  -o "${EXPERIMENT_DIR}/tools/dictionary_generator"

("${EXPERIMENT_DIR}/tools/dictionary_generator" --help 2>&1 || true) | \
  sed -n '1,18p'
sha256sum \
  "${SOURCE_DIR}/research/dictionary_generator.cc" \
  "${SOURCE_DIR}/research/sieve.cc" \
  "${EXPERIMENT_DIR}/tools/dictionary_generator"
