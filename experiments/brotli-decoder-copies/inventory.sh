#!/bin/sh
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
out="$here/out"
dest="${1:-$here/results}"
mkdir -p "$out" "$dest"

roots="/usr/bin /usr/lib /usr/local /opt $HOME/.nvm $HOME/.bun $HOME/.cargo $HOME/go $HOME/.local $HOME/.rustup"
marker="timedownlifeleftback"
fixed_text="_ERROR_FORMAT_BLOCK_SWITCH"
table_text="_ERROR_FORMAT_EXUBERANT_NIBBLE"
list="$out/dictionary-files.txt"

is_elf() {
  [ "$(head -c 4 "$1" | od -An -c | tr -d ' ')" = "177ELF" ]
}

owner_of() {
  o=$(pacman -Qqo "$1" 2>/dev/null || true)
  if [ -n "$o" ]; then
    printf '%s' "$o"
  else
    case "$1" in
      "$HOME"/*) printf 'home, no package' ;;
      *) printf 'no package' ;;
    esac
  fi
}

needs_brotli() {
  n=$(readelf -d "$1" 2>/dev/null | grep NEEDED | grep -o 'libbrotli[a-z]*\.so\.[0-9]*' | tr '\n' ' ' | sed 's/ $//' || true)
  printf '%s' "${n:-none}"
}

imports() {
  nm -D --undefined-only "$1" 2>/dev/null | grep -c 'BrotliDecoder' || true
}

has_text() {
  if LC_ALL=C grep -qaF -- "$2" "$1"; then printf 'yes'; else printf 'no'; fi
}

label_of() {
  case "$1" in
    "$HOME"/.local/share/*/versions/*) printf 'DIR/one-tool/build-%s' "$2" ;;
    "$HOME"/.local/share/*) printf 'DIR/.local/share/another-tool' ;;
    *) printf '%s' "$1" | sed "s|$HOME|DIR|" ;;
  esac
}

# shellcheck disable=SC2086
{ find $roots -xdev -type f -size +120k -print0 2>/dev/null \
  | LC_ALL=C xargs -0 grep -lF -- "$marker" 2>/dev/null \
  | sort -V > "$list"; } || true

build=0
{
  printf '%-52s %-22s %-36s %-8s %-4s %s\n' "file" "owner" "needs" "imports" "fix" "table"
  while IFS= read -r f; do
    is_elf "$f" || continue
    n=""
    case "$f" in
      "$HOME"/.local/share/*/versions/*) build=$((build + 1)); n=$build ;;
    esac
    printf '%-52s %-22s %-36s %-8s %-4s %s\n' "$(label_of "$f" "$n")" "$(owner_of "$f")" \
      "$(needs_brotli "$f")" "$(imports "$f")" "$(has_text "$f" "$fixed_text")" "$(has_text "$f" "$table_text")"
  done < "$list"
} > "$dest/inventory.txt"

build=0
{
  echo "one program, every version still on disk, oldest first"
  while IFS= read -r f; do
    case "$f" in
      "$HOME"/.local/share/*/versions/*) ;;
      *) continue ;;
    esac
    build=$((build + 1))
    runtime=$(LC_ALL=C grep -aoE 'Bun v[0-9]+\.[0-9]+\.[0-9]+' "$f" | sort -u | tr '\n' ' ' | sed 's/ $//' || true)
    revision=$(LC_ALL=C grep -aoE '\b1\.[0-9]+\.[0-9]+\+[0-9a-f]{7,12}\b' "$f" | sort -u | tr '\n' ' ' | sed 's/ $//' || true)
    printf 'build-%s  runtime %-11s %-18s fixed error name: %s\n' "$build" "$runtime" "$revision" "$(has_text "$f" "$fixed_text")"
  done < "$list"
} > "$dest/one-tool-builds.txt"

{
  echo "Go programs among the files above, and the Brotli module inside each"
  while IFS= read -r f; do
    is_elf "$f" || continue
    m=$(go version -m "$f" 2>/dev/null | grep -i brotli || true)
    [ -n "$m" ] || continue
    printf '%s\n%s\n' "$(label_of "$f" "")" "$m"
  done < "$list"
} > "$dest/go-modules.txt"

{
  echo "files in /usr/bin and /usr/lib with a NEEDED entry for libbrotlidec.so.1"
  { grep -rlF -- "libbrotlidec.so.1" /usr/bin /usr/lib 2>/dev/null || true; } | sort | while IFS= read -r f; do
    [ -f "$f" ] && [ ! -L "$f" ] || continue
    is_elf "$f" || continue
    readelf -d "$f" 2>/dev/null | grep -q 'NEEDED.*libbrotlidec\.so\.1' || continue
    printf '%-52s %s\n' "$f" "$(owner_of "$f")"
  done
} > "$dest/shared-users.txt"

{
  echo "decoder libraries next to a libbrotlicommon from the scan, outside /usr/lib"
  while IFS= read -r f; do
    case "$f" in
      */libbrotlicommon.so*) ;;
      *) continue ;;
    esac
    d=$(dirname "$f")
    [ "$d" != /usr/lib ] || continue
    [ -e "$d/libbrotlidec.so.1" ] || continue
    echo "== $(printf '%s' "$d" | sed "s|$HOME|DIR|")"
    "$out/fingerprint" "$d" 2>&1 | sed "s|$HOME|DIR|g"
  done < "$list"
} > "$dest/bundled-libs.txt"
