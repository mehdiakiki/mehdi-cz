#!/usr/bin/env bash
# Rebuilds every probe of this fixture and rewrites the files in results/.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS="$HERE/results"
PROBES="$HERE/probes"
WORK="$(mktemp -d)"
TOOLCHAIN=1.99.1

TARGETS=(
  x86_64-unknown-linux-gnu
  aarch64-unknown-linux-gnu
  i686-unknown-linux-gnu
  x86_64-pc-windows-msvc
  aarch64-apple-darwin
  wasm32-unknown-unknown
  thumbv7em-none-eabi
  s390x-unknown-linux-gnu
  powerpc64-unknown-linux-gnu
)
CFG_TARGETS=("${TARGETS[@]}" x86_64-unknown-linux-musl)
IMAGES=(alpine:3.22 debian:bullseye-slim debian:bookworm-slim)

mkdir -p "$RESULTS"

rustc_at() {
  local toolchain="$1"
  shift
  rustc "+$toolchain" --edition 2024 "$@"
}

# Replaces the temporary directory with $WORK and process ids with <pid>.
normalize() {
  sed -E -e "s|$WORK|\$WORK|g" -e 's/line 1: [0-9]+ /line 1: <pid> /'
}

# Prints the exit status, with the signal name when a signal ended the process.
describe_status() {
  local status="$1"
  if [ "$status" -gt 128 ]; then
    echo "exit status: $status (SIG$(kill -l "$status"))"
  else
    echo "exit status: $status"
  fi
}

# Runs a command, prints its combined output and its exit status, and never
# stops the script because of that status.
show() {
  local status=0 out
  out="$("$@" 2>&1)" || status=$?
  if [ -n "$out" ]; then
    printf '%s\n' "$out" | normalize
  fi
  describe_status "$status"
}

# Runs a program as one line of a bash script.
run_in_shell() {
  show bash -c "$(printf '%q' "$1"); exit \$?"
}

# Prints the instruction lines of one function from an assembly file.
function_body() {
  local file="$1" name="$2"
  awk -v name="$name" '
    $0 ~ "^_?" name ":" { inside = 1; next }
    inside && ($1 == ".cfi_endproc" || $1 ~ /^\.?Lfunc_end/) { inside = 0 }
    inside && $1 !~ /^\./ && $1 !~ /^Lloh/ && $1 !~ /^[#;@]/ && $1 !~ /^\.L/ {
      sub(/^[ \t]+/, "")
      tab = index($0, "\t")
      if (tab) printf "    %-7s %s\n", substr($0, 1, tab - 1), substr($0, tab + 1)
      else print "    " $0
    }
  ' "$file"
}

write_toolchain() {
  {
    echo "== rustc +1.99.1 -vV"
    rustc +1.99.1 -vV
    echo "== rustc +1.99.0 -V"
    rustc +1.99.0 -V
    echo "== rustc +1.98.0 -V"
    rustc +1.98.0 -V
    echo "== cargo +1.99.1 -V"
    cargo +1.99.1 -V
    echo "== host"
    echo "kernel: $(uname -sr), machine: $(uname -m)"
    echo "cpu: $(lscpu | sed -n 's/^Model name: *//p')"
    echo "glibc: $(ldd --version | head -n 1)"
    echo "cc: $(cc --version | head -n 1)"
    echo "node: $(node --version)"
    echo "docker: $(docker version --format '{{.Server.Version}}')"
  } > "$RESULTS/toolchain.txt"
}

write_cfg() {
  local raw="$RESULTS/cfg-raw.txt" summary="$RESULTS/cfg-summary.txt" t
  : > "$raw"
  for t in "${CFG_TARGETS[@]}"; do
    {
      echo "== rustc +$TOOLCHAIN --print cfg --target $t"
      rustc "+$TOOLCHAIN" --print cfg --target "$t"
    } >> "$raw"
  done
  {
    printf '%-28s %-10s %-8s %-5s %-7s %-4s %-7s %-7s %-9s %s\n' \
      target arch os env family ptr endian panic features target_has_atomic
    for t in "${CFG_TARGETS[@]}"; do
      rustc "+$TOOLCHAIN" --print cfg --target "$t" | awk -v t="$t" -F= '
        { value = $2; gsub(/"/, "", value) }
        $1 == "target_arch" { arch = value }
        $1 == "target_os" { os = value }
        $1 == "target_env" { env = value }
        $1 == "target_family" { family = value }
        $1 == "target_pointer_width" { ptr = value }
        $1 == "target_endian" { endian = value }
        $1 == "panic" { panic = value }
        $1 == "target_feature" { features++ }
        $1 == "target_has_atomic" { atomic[value] = 1 }
        END {
          list = ""
          split("8 16 32 64 128 ptr", order, " ")
          for (i = 1; i <= 6; i++) if (order[i] in atomic) list = list (list == "" ? "" : ",") order[i]
          printf "%-28s %-10s %-8s %-5s %-7s %-4s %-7s %-7s %-9d %s\n", t, arch, os, \
            (env == "" ? "-" : env), (family == "" ? "-" : family), ptr, endian, panic, features, list
        }'
    done
  } > "$summary"
}

write_data_model() {
  local out="$RESULTS/data-model.txt" t line
  {
    printf '%-28s %-6s %-5s %-6s %-5s %-9s %-9s %-10s %-15s %-11s %s\n' \
      target c_char c_int c_long usize align_u64 align_f64 align_u128 align_AtomicU64 size_Header \
      first_byte_of_0x01020304
    for t in "${TARGETS[@]}"; do
      rustc_at "$TOOLCHAIN" --crate-type lib --emit=obj --target "$t" \
        -o "$WORK/data-model-$t.o" "$PROBES/data_model.rs"
      line="$(strings -a "$WORK/data-model-$t.o" | grep '^data-model:')"
      echo "$line" | awk -v t="$t" '{
        for (i = 2; i < NF; i++) { split($i, kv, "="); v[kv[1]] = kv[2] }
        printf "%-28s %-6s %-5s %-6s %-5s %-9s %-9s %-10s %-15s %-11s %s\n", t, v["c_char"], v["c_int"], \
          v["c_long"], v["usize"], v["align_u64"], v["align_f64"], v["align_u128"], \
          v["align_AtomicU64"], v["size_Header"], v["first_byte_of_0x01020304"]
      }'
    done
    echo
    echo "Header is #[repr(C)] struct Header { kind: u8, len: u64 }."
    echo "Each row is the text that rustc computed in const context and stored in the object file."
  } > "$out"
}

write_cargo_check() {
  local crate="$1" out="$RESULTS/cargo-check-$1.txt" t status text
  : > "$out"
  for t in "${TARGETS[@]}"; do
    status=0
    text="$(cargo "+$TOOLCHAIN" check --quiet --offline --locked --target "$t" \
      --target-dir "$WORK/target-$crate" \
      --manifest-path "$HERE/assumptions/$crate/Cargo.toml" \
      --message-format short 2>&1)" || status=$?
    {
      if [ "$status" -eq 0 ]; then
        echo "== cargo check --target $t: ok"
      else
        echo "== cargo check --target $t: failed"
        printf '%s\n' "$text" | normalize
      fi
    } >> "$out"
  done
}

write_cargo_check_full_thumb() {
  local out="$RESULTS/cargo-check-named-thumbv7em-full.txt"
  {
    echo "== cargo check --target thumbv7em-none-eabi (named crate, full messages, first error)"
    cargo "+$TOOLCHAIN" check --quiet --offline --locked --target thumbv7em-none-eabi \
      --target-dir "$WORK/target-named-full" \
      --manifest-path "$HERE/assumptions/named/Cargo.toml" 2>&1 | sed -n '1,4p' || true
  } > "$out"
}

write_cargo_check_matrix() {
  local out="$RESULTS/cargo-check-named-matrix.txt" args=() t
  for t in "${TARGETS[@]}"; do
    if [ "$t" != thumbv7em-none-eabi ]; then
      args+=(--target "$t")
    fi
  done
  {
    echo "== cargo +$TOOLCHAIN check ${args[*]}"
    (cd "$HERE/assumptions/named" && show cargo "+$TOOLCHAIN" check --offline --locked \
      --target-dir "$WORK/target-named-matrix" "${args[@]}") \
      | sed -E -e "s|$HERE|<fixture>|g" -e 's/ in [0-9.]+m?s$/ in <time>/'
  } > "$out"
}

write_atomics() {
  local out="$RESULTS/atomics-asm.txt" t f
  : > "$out"
  for t in x86_64-unknown-linux-gnu aarch64-unknown-linux-gnu; do
    rustc_at "$TOOLCHAIN" --crate-type lib --emit=asm -C opt-level=2 --target "$t" \
      -o "$WORK/orderings-$t.s" "$PROBES/orderings.rs"
    for f in load_relaxed load_acquire store_relaxed store_release; do
      {
        echo "== $t $f"
        function_body "$WORK/orderings-$t.s" "$f"
      } >> "$out"
    done
  done
}

write_bool_return() {
  local out="$RESULTS/bool-return-asm.txt" v o
  : > "$out"
  for v in 1.98.0 1.99.0 1.99.1; do
    for o in 0 1 2 3; do
      rustc_at "$v" --crate-type lib --emit=asm -C "opt-level=$o" --target x86_64-unknown-linux-gnu \
        -o "$WORK/bool-$v-$o.s" "$PROBES/bool_return.rs"
      {
        echo "== rustc +$v -C opt-level=$o, x86_64-unknown-linux-gnu, lowest_bit_is_set"
        function_body "$WORK/bool-$v-$o.s" lowest_bit_is_set
      } >> "$out"
    done
  done
}

write_cpu_level() {
  local out="$RESULTS/cpu-level.txt" cpu flags count
  {
    echo "== this machine"
    echo "cpu: $(lscpu | sed -n 's/^Model name: *//p')"
    for flags in avx2 avx512f; do
      if grep -qw "$flags" /proc/cpuinfo; then
        echo "/proc/cpuinfo flag $flags: present"
      else
        echo "/proc/cpuinfo flag $flags: absent"
      fi
    done
    rustc "+$TOOLCHAIN" --print target-cpus --target x86_64-unknown-linux-gnu | grep -E '^ +native '
    echo
    echo "== x86-64 levels in the help of the dynamic loader of this machine"
    /lib64/ld-linux-x86-64.so.2 --help | sed -n '/^Subdirectories of glibc-hwcaps/,$p'
    echo
    echo "== target_feature entries in --print cfg"
    for cpu in x86-64 native x86-64-v3 x86-64-v4; do
      count="$(rustc "+$TOOLCHAIN" --print cfg --target x86_64-unknown-linux-gnu "-Ctarget-cpu=$cpu" \
        | grep -c target_feature)"
      echo "-C target-cpu=$cpu: $count"
    done
    echo
    echo "== target_feature entries of x86-64-v4 that x86-64-v3 does not have"
    comm -13 \
      <(rustc "+$TOOLCHAIN" --print cfg --target x86_64-unknown-linux-gnu -Ctarget-cpu=x86-64-v3 \
        | grep target_feature | sort) \
      <(rustc "+$TOOLCHAIN" --print cfg --target x86_64-unknown-linux-gnu -Ctarget-cpu=x86-64-v4 \
        | grep target_feature | sort)
    for cpu in x86-64 native x86-64-v3 x86-64-v4; do
      rustc_at "$TOOLCHAIN" -C opt-level=3 "-Ctarget-cpu=$cpu" --emit=asm \
        -o "$WORK/cpu-$cpu.s" "$PROBES/cpu_level.rs"
      rustc_at "$TOOLCHAIN" -C opt-level=3 "-Ctarget-cpu=$cpu" \
        -o "$WORK/cpu-$cpu" "$PROBES/cpu_level.rs"
      echo
      echo "== -C target-cpu=$cpu: multiply instructions and registers in dot_u64"
      { function_body "$WORK/cpu-$cpu.s" dot_u64 | grep -oE '\bv?pmul[a-z]*|%[xyz]mm' || true; } \
        | sort | uniq -c | awk '{ out = out (NR > 1 ? ", " : "") $1 " " $2 } END { print out }'
      echo "== -C target-cpu=$cpu: run on this machine"
      run_in_shell "$WORK/cpu-$cpu"
    done
  } > "$out"
}

ensure_image() {
  docker image inspect "$1" > /dev/null 2>&1 || docker pull --quiet "$1" > /dev/null
}

write_loader() {
  local out="$RESULTS/loader.txt" bin="$WORK/bin" image name
  mkdir -p "$bin"
  rustc_at "$TOOLCHAIN" -C opt-level=2 --target x86_64-unknown-linux-gnu \
    -o "$bin/hello-gnu" "$PROBES/hello.rs"
  rustc_at "$TOOLCHAIN" -C opt-level=2 --target x86_64-unknown-linux-musl \
    -o "$bin/hello-musl" "$PROBES/hello.rs"
  rustc_at "$TOOLCHAIN" -C opt-level=2 --target aarch64-unknown-linux-musl \
    -C linker=rust-lld -C linker-flavor=ld.lld -o "$bin/hello-aarch64" "$PROBES/hello.rs"
  for image in "${IMAGES[@]}"; do
    ensure_image "$image"
  done
  {
    echo "== file"
    (cd "$bin" && file hello-gnu hello-musl hello-aarch64) | sed -E 's/, BuildID\[sha1\]=[0-9a-f]+//'
    echo
    echo "== readelf -lW hello-gnu | grep interpreter"
    readelf -lW "$bin/hello-gnu" | grep interpreter
    echo "== readelf -lW hello-musl | grep -c interpreter"
    readelf -lW "$bin/hello-musl" | grep -c interpreter || true
    echo
    echo "== glibc symbol versions required by hello-gnu (objdump -T)"
    objdump -T "$bin/hello-gnu" | grep -oE 'GLIBC_[0-9.]+' | sort -uV | paste -sd ' '
    echo "== symbols that need GLIBC_2.30 or newer"
    objdump -T "$bin/hello-gnu" | grep -E 'GLIBC_2\.(3[0-9]|4[0-9])' \
      | awk '{ print "    " $(NF-1), $NF }' | sort -V
    echo
    echo "== this machine: $(ldd --version | head -n 1)"
    echo "== versions of __libc_start_main in /usr/lib/libc.so.6 (objdump -T)"
    objdump -T /usr/lib/libc.so.6 | grep -w __libc_start_main | tr '\t' ' '
    echo "== linker named in the .comment section of hello-gnu"
    readelf -p .comment "$bin/hello-gnu" | grep -o 'Linker: LLD [0-9.]*'
    echo "== binfmt_misc entries on this machine (ls -A /proc/sys/fs/binfmt_misc)"
    ls -A /proc/sys/fs/binfmt_misc
    echo
    echo "== run hello-gnu, hello-musl, hello-aarch64 on this x86_64 machine"
    for name in hello-gnu hello-musl hello-aarch64; do
      run_in_shell "$bin/$name"
    done
    for image in "${IMAGES[@]}"; do
      echo
      echo "== docker image $image ($(docker image inspect --format '{{.Id}}' "$image" | cut -c1-19))"
      if [ "${image%%:*}" = alpine ]; then
        docker run --rm --pull never --network none "$image" sh -c \
          'ldd 2>&1 | head -n 2; ls /lib/ld-musl-x86_64.so.1; ls /lib64/ld-linux-x86-64.so.2 2>&1' || true
      else
        docker run --rm --pull never --network none "$image" sh -c 'ldd --version | head -n 1'
      fi
      for name in hello-gnu hello-musl; do
        echo "-- sh -c /w/$name"
        show docker run --rm --pull never --network none -v "$bin:/w:ro" "$image" sh -c "/w/$name"
      done
    done
  } > "$out"
}

write_wasm() {
  local out="$RESULTS/wasm-os.txt"
  rustc_at "$TOOLCHAIN" -C opt-level=2 --crate-type cdylib --target wasm32-unknown-unknown \
    -o "$WORK/wasm_os.wasm" "$PROBES/wasm_os.rs"
  {
    echo "== wasm32-unknown-unknown cdylib built with rustc $TOOLCHAIN, run by node $(node --version)"
    show node "$PROBES/run_wasm.mjs" "$WORK/wasm_os.wasm"
  } > "$out"
}

write_labs() {
  local out="$RESULTS/labs-i64.txt" t o
  : > "$out"
  for t in x86_64-unknown-linux-gnu i686-unknown-linux-gnu; do
    for o in 0 2; do
      rustc_at "$TOOLCHAIN" -C "opt-level=$o" --target "$t" -o "$WORK/labs-$t-$o" "$PROBES/labs_i64.rs"
      rustc_at "$TOOLCHAIN" -C "opt-level=$o" --target "$t" --emit=llvm-ir \
        -o "$WORK/labs-$t-$o.ll" "$PROBES/labs_i64.rs"
      {
        echo "== $t, -C opt-level=$o"
        run_in_shell "$WORK/labs-$t-$o"
        echo "LLVM IR lines that call labs or llvm.abs:"
        grep -E 'call .*@(labs|llvm\.abs)' "$WORK/labs-$t-$o.ll" | sed -E 's/^ +/    /' || echo "    none"
      } >> "$out"
    done
  done
  local value addr
  value="$("$WORK/labs-i686-unknown-linux-gnu-0" | sed -n 's/.* returned //p')"
  addr="$(nm -D /usr/lib32/libc.so.6 | awk '$3 ~ /^labs@@/ { print $1 }')"
  {
    echo "== the i686 -C opt-level=0 value in hex"
    printf 'returned %s = 0x%016x\n' "$value" "$value"
    printf 'high half 0x%08x, low half 0x%08x = %d\n' \
      $(( (value >> 32) & 0xffffffff )) $(( value & 0xffffffff )) $(( value & 0xffffffff ))
    printf 'low 32 bits of -5000000000: 0x%08x\n' $(( -5000000000 & 0xffffffff ))
    echo "== labs in /usr/lib32/libc.so.6 (objdump -d, up to ret)"
    objdump -d --no-show-raw-insn --start-address="0x$addr" \
      --stop-address="$(printf '0x%x' $(( 0x$addr + 64 )))" /usr/lib32/libc.so.6 \
      | awk -F'\t' 'done { next } /^ +[0-9a-f]+:/ { print "    " $2; if ($2 ~ /^ret/) done = 1 }'
  } >> "$out"
}

write_cast_patches() {
  local out="$RESULTS/cast-patches.txt" t
  : > "$out"
  for t in aarch64-unknown-linux-gnu x86_64-pc-windows-msvc i686-unknown-linux-gnu; do
    {
      echo "== rustc --crate-type lib --emit=metadata --target $t (all warnings are printed here)"
      show rustc_at "$TOOLCHAIN" --crate-type lib --emit=metadata --target "$t" \
        -o "$WORK/cast-patches-$t.rmeta" "$PROBES/cast_patches.rs"
    } >> "$out"
  done
  for t in x86_64-unknown-linux-gnu i686-unknown-linux-gnu; do
    rustc_at "$TOOLCHAIN" -C opt-level=2 --target "$t" -o "$WORK/cast-patches-$t" "$PROBES/cast_patches.rs"
    {
      echo "== run on this machine, $t"
      run_in_shell "$WORK/cast-patches-$t"
    } >> "$out"
  done
}

write_variadic() {
  local out="$RESULTS/variadic-asm.txt" t k
  : > "$out"
  for t in x86_64-unknown-linux-gnu aarch64-unknown-linux-gnu aarch64-apple-darwin; do
    for k in ok fixed; do
      rustc_at "$TOOLCHAIN" --crate-type lib --emit=asm -C opt-level=2 --target "$t" \
        -o "$WORK/variadic-$k-$t.s" "$PROBES/variadic_$k.rs"
      {
        echo "== $t, printf declared $( [ "$k" = ok ] && echo 'as (format, ...)' || echo 'as (format, value: c_int)')"
        function_body "$WORK/variadic-$k-$t.s" print_value
      } >> "$out"
    done
  done
}

write_toolchain
write_cfg
write_data_model
write_cargo_check implicit
write_cargo_check named
write_cargo_check_full_thumb
write_cargo_check_matrix
write_atomics
write_bool_return
write_cpu_level
write_loader
write_wasm
write_labs
write_cast_patches
write_variadic

echo "results written to $RESULTS"
