/^write\(1, "  / {
    step = $0
    sub(/^write\(1, "  /, "", step)
    sub(/ +Rss.*/, "", step)
    printf "  %-48s brk %4d   madvise %4d\n", step, brk, madvise
    brk = 0
    madvise = 0
    next
}
/^brk\(/ { brk++ }
/^madvise\(/ { madvise++ }
