#!/usr/bin/env bash
# Each check asks the same question: is this compiler at least Rust 1.80?
set -u
for version in 1.99.1 1.100.0; do
  line="rustc $version (58cf8f9c3 2026-10-13)"
  echo "== $version"

  if [[ "$version" > "1.80.0" ]]; then echo "bash [[ > ]]         new enough"; else echo "bash [[ > ]]         too old"; fi

  echo "awk >= 1.80          $(echo "$version" | awk '{ print ($1 >= 1.80) ? "new enough" : "too old" }')"

  echo "grep -oE 1.[0-9]{2}  $(echo "$line" | grep -oE '1\.[0-9]{2}')"

  newest=$(printf '1.98.1\n%s\n1.97.0\n' "$version" | sort | tail -n1)
  echo "sort | tail          newest is $newest"

  newest=$(printf '1.98.1\n%s\n1.97.0\n' "$version" | sort -V | tail -n1)
  echo "sort -V | tail       newest is $newest"

  minor=$(echo "$version" | cut -d. -f2)
  if [ "$minor" -ge 80 ]; then echo "cut + integer test   new enough"; else echo "cut + integer test   too old"; fi
done

echo "== 1.100.0-beta.7"
patch=$(echo "1.100.0-beta.7" | cut -d. -f3)
echo "cut -d. -f3          $patch"
bash -c "[ '$patch' -ge 0 ]" 2>&1 || true
