#!/usr/bin/env sh
# Reproduces every output quoted in "What Is a Type? A Set of Values, a Promise
# About Operations, or Both". Run from the repository root:
#   sh experiments/rust-atlas/types-under-the-hood/run.sh
set -eu
cd "$(dirname "$0")"
TSC="${TSC:-../../../node_modules/.bin/tsc}"
OUT="${OUT:-./out}"
mkdir -p "$OUT"

echo "== TypeScript: compiled output of human.ts"
"$TSC" --target es2020 --skipLibCheck --types --outDir "$OUT" human.ts
cat "$OUT/human.js"
echo "occurrences of the word Human in the output: $(grep -c Human "$OUT/human.js" || true)"
echo "== TypeScript: the compile-time error"
"$TSC" --target es2020 --skipLibCheck --types --noEmit human_bad.ts || true

echo "== Rust: size, byte values, Option size"
rustc -O human.rs -o "$OUT/human_rs" && "$OUT/human_rs"
rustc -O opt.rs -o "$OUT/opt" && "$OUT/opt"
echo "== Rust: the compile-time error"
rustc human_bad.rs -o "$OUT/never" 2>&1 | head -1 || true
echo "== Rust: assembly of greet"
rustc -O --emit asm --crate-type lib -C panic=abort human_lib.rs -o "$OUT/human_lib.s"
awk '/^greet:/{p=1} p{print} p&&/ret/{exit}' "$OUT/human_lib.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'

echo "== C: size, greet(MAN), greet(7)"
gcc -O2 -Wall -Wextra human.c -o "$OUT/human_c" && "$OUT/human_c"
echo "== C: assembly of greet"
gcc -O2 -S human.c -o "$OUT/human_c.s"
awk '/^greet:/{p=1} p{print} p&&/ret$/{exit}' "$OUT/human_c.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text|LFB)'

echo "== Article 2: one u8 through the compiler (age.rs)"
echo "-- HIR"
rustc -Z unpretty=hir --crate-type lib age.rs 2>/dev/null | sed -n '/fn bump(/,/^}/p'
echo "-- MIR, release"
rustc -O --emit mir --crate-type lib age.rs -o "$OUT/age.mir" 2>/dev/null; sed -n '/^fn bump(/,/^}/p' "$OUT/age.mir"
echo "-- MIR, debug"
rustc --emit mir --crate-type lib age.rs -o "$OUT/age_debug.mir" 2>/dev/null; sed -n '/^fn bump(/,/^}/p' "$OUT/age_debug.mir"
echo "-- LLVM IR, release"
rustc -O --emit llvm-ir --crate-type lib age.rs -o "$OUT/age.ll" 2>/dev/null; sed -n '/define.*@bump(/,/^}/p' "$OUT/age.ll"
echo "-- assembly, release, both functions"
rustc -O --emit asm --crate-type lib -C panic=abort age.rs -o "$OUT/age.s" 2>/dev/null
for f in bump bump_wide; do awk -v f="^$f:" '$0 ~ f {p=1} p{print} p&&/ret/{exit}' "$OUT/age.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'; done
echo "-- assembly, debug, bump only"
rustc --emit asm --crate-type lib -C panic=abort age.rs -o "$OUT/age_debug.s" 2>/dev/null
awk '/^bump:/{p=1} p{print} p&&/^\.Lfunc_end0/{exit}' "$OUT/age_debug.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'
echo "-- age_run, debug build (panics on purpose)"
rustc age_run.rs -o "$OUT/age_run_debug" 2>/dev/null; "$OUT/age_run_debug" 2>&1 || true
echo "-- age_run, release build"
rustc -O age_run.rs -o "$OUT/age_run_release" 2>/dev/null; "$OUT/age_run_release"
echo "-- age_tests, debug build"
rustc --test age_tests.rs -o "$OUT/age_tests_debug" 2>/dev/null; "$OUT/age_tests_debug" 2>&1 | grep -E '^test |test result'
echo "-- age_tests, release build"
rustc --test -O age_tests.rs -o "$OUT/age_tests_release" 2>/dev/null; "$OUT/age_tests_release" 2>&1 | grep -E '^test |test result'
echo "-- age_lint.rs must not compile, in any build mode"
rustc age_lint.rs -o "$OUT/never" 2>&1 | head -7 || true
rustc -O age_lint.rs -o "$OUT/never" 2>&1 | head -1 || true
echo "-- caller side of bump in the release build of age_run (extend before the call, read one byte after)"
rustc -O --emit asm age_run.rs -o "$OUT/age_run.s" 2>/dev/null
grep -nE 'movzbl|callq.*4bump|movb\s+%al' "$OUT/age_run.s" | head -3
echo "-- without black_box the release build never calls bump (call count in the assembly):"
sed 's/std::hint::black_box(255)/255/' age_run.rs > "$OUT/age_run_nobb.rs"
rustc -O --emit asm "$OUT/age_run_nobb.rs" -o "$OUT/nobb.s" 2>/dev/null; grep -cE 'callq.*bump' "$OUT/nobb.s" || true

echo "== Article 3: a type is a set (sets.rs, sets_missing.rs, sets_void.rs, sets.ts)"
rustc -O sets.rs -o "$OUT/sets" 2>/dev/null && "$OUT/sets"
echo "-- sets_missing.rs must not compile"
rustc sets_missing.rs -o "$OUT/never" 2>&1 | grep -E '^error|not covered|matched value' || true
echo "-- sets_void.rs"
rustc -O sets_void.rs -o "$OUT/sets_void" 2>/dev/null && "$OUT/sets_void"
echo "-- sets.ts: the never trick reports the missing case"
"$TSC" --target es2020 --skipLibCheck --types --strict --noEmit sets.ts || true

echo "== Article 4: shape without behavior (shape.rs, shape_mismatch.rs, shape.ts, shape_excess.ts)"
rustc -O shape.rs -o "$OUT/shape" 2>/dev/null && "$OUT/shape"
echo "-- assembly: the two norm functions"
rustc -O --emit asm --crate-type lib -C panic=abort shape.rs -o "$OUT/shape.s" 2>/dev/null
awk '/^point_norm:/{p=1} p{print} p&&/ret/{exit}' "$OUT/shape.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'
grep -E '^vector_norm = ' "$OUT/shape.s"
echo "-- shape_mismatch.rs must not compile"
rustc shape_mismatch.rs -o "$OUT/never" 2>&1 | grep -E '^error|expected' || true
echo "-- shape.ts compiles and runs"
"$TSC" --target es2020 --skipLibCheck --types --strict --outDir "$OUT" shape.ts && node "$OUT/shape.js"
echo "-- shape_excess.ts must not compile"
"$TSC" --target es2020 --skipLibCheck --types --strict --noEmit shape_excess.ts || true

echo "== Article 5: behavior without shape (behavior.rs, behavior_closed.rs, behavior.ts)"
rustc -O behavior.rs -o "$OUT/behavior" 2>/dev/null && "$OUT/behavior"
echo "-- assembly, release: with_trait and the alias for without_trait"
rustc -O --emit asm --crate-type lib -C panic=abort behavior.rs -o "$OUT/behavior.s" 2>/dev/null
awk '/^with_trait:/{p=1} p{print} p&&/ret/{exit}' "$OUT/behavior.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'
grep -E '^without_trait = ' "$OUT/behavior.s"
echo "-- behavior_closed.rs must not compile"
rustc behavior_closed.rs -o "$OUT/never" 2>&1 | grep -E '^error|the method was found|Door<Open>' || true
echo "-- behavior.ts: the interface leaves nothing behind"
"$TSC" --target es2020 --skipLibCheck --types --strict --outDir "$OUT" behavior.ts && cat "$OUT/behavior.js" && node "$OUT/behavior.js"
echo "occurrences of the word Stamp in the output: $(grep -c Stamp "$OUT/behavior.js" || true)"
echo "-- assembly, debug: the trait call is a real call and the plain multiply is checked"
rustc --emit asm --crate-type lib -C panic=abort behavior.rs -o "$OUT/behavior_debug.s" 2>/dev/null
for f in with_trait without_trait; do awk -v f="^$f:" '$0 ~ f {p=1} p{print} p&&/^\.Lfunc_end/{exit}' "$OUT/behavior_debug.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)' | head -8; done

echo "== Article 6: layout (layout.rs, layout.c)"
rustc -O layout.rs -o "$OUT/layout" 2>/dev/null && "$OUT/layout"
gcc -O2 -Wall layout.c -o "$OUT/layout_c" && "$OUT/layout_c"

echo "== Article 7: erasure and monomorphization (erasure.rs, erasure_lib.rs, erasure.ts)"
rustc -O erasure.rs -o "$OUT/erasure" 2>/dev/null && "$OUT/erasure"
rustc -O --crate-type rlib -C symbol-mangling-version=v0 erasure_lib.rs -o "$OUT/liberasure.rlib" 2>/dev/null
echo "-- one symbol per instantiated type"
nm "$OUT/liberasure.rlib" 2>/dev/null | grep -oE '_R[A-Za-z0-9_]*(5first|12speak_static|9speak_dyn)[A-Za-z0-9_]*' | sort -u
echo "-- the dynamic call site is a jump through the vtable"
rustc -O --emit asm --crate-type lib -C panic=abort erasure_lib.rs -o "$OUT/erasure_lib.s" 2>/dev/null
awk '/9speak_dyn:/{p=1} p{print} p&&/(retq|jmpq)/{exit}' "$OUT/erasure_lib.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'
echo "-- TypeScript keeps one copy and no interface"
"$TSC" --target es2020 --skipLibCheck --types --strict --outDir "$OUT" erasure.ts && cat "$OUT/erasure.js" && node "$OUT/erasure.js"

echo "== Article 8: the processor has no types (bits.rs, bits_run.rs)"
rustc -O --emit asm --crate-type lib -C panic=abort bits.rs -o "$OUT/bits.s" 2>/dev/null
for f in add_i32 add_f32 less_i32 less_u32 div_i32 div_u32 shr_i32 shr_u32; do
  echo "-- $f"; awk -v f="^$f:" '$0 ~ f {p=1} p{print} p&&/ret/{exit}' "$OUT/bits.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'
done
grep -E '^add_u32 = ' "$OUT/bits.s"
rustc -O bits_run.rs -o "$OUT/bits_run" 2>/dev/null && "$OUT/bits_run"

echo "== Article 9: runtime type tags (tags.py, tags.mjs)"
python3 tags.py
node tags.mjs

echo "== Article 10: types as proofs (proofs.rs, proofs_bad.rs)"
rustc -O proofs.rs -o "$OUT/proofs" 2>/dev/null && "$OUT/proofs"
rustc -O --emit asm --crate-type lib -C panic=abort proofs.rs -o "$OUT/proofs.s" 2>/dev/null
for f in add_meters speed; do awk -v f="^$f:" '$0 ~ f {p=1} p{print} p&&/ret/{exit}' "$OUT/proofs.s" | grep -vE '^\s*\.(cfi|p2align|type|size|globl|section|text)'; done
grep -E '^add_plain = ' "$OUT/proofs.s"
echo "-- proofs_bad.rs must not compile"
rustc proofs_bad.rs -o "$OUT/never" 2>&1 | grep -E '^error' || true
