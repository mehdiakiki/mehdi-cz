#!/bin/sh
# Prints the relocation sections of an ELF file and how many relocations of each type it has.
set -eu
readelf -rW "$1" | awk '
    /^Relocation section/ { print }
    $3 ~ /^R_X86_64/ { count[$3]++ }
    END { for (t in count) printf "    %-20s %5d\n", t, count[t] }' | sort -s -k1,1
