#!/bin/sh
# Builds and runs the experiments of the series "When the benchmark lies".
#   sh run.sh          runs every part
#   sh run.sh 7 12     runs only parts 7 and 12
# Results go to out/results/ unless RESULTS is set (RESULTS=results rewrites
# the published result files in results/).
set -eu
cd "$(dirname "$0")"
OUT=out
RESULTS=${RESULTS:-$OUT/results}
RUSTC="rustc +1.98.0"
CPU=${CPU:-2}
ECPU=${ECPU:-10}
mkdir -p "$OUT" "$RESULTS"

# Percent busy of every CPU over one second, from /proc/stat.
busy() {
    a=$(grep '^cpu[0-9]' /proc/stat)
    sleep 1
    b=$(grep '^cpu[0-9]' /proc/stat)
    printf '%s\n%s\n' "$a" "$b" | awk '
        { t = 0; for (i = 2; i <= 9; i++) t += $i; idle = $5 + $6 }
        $1 in T {
            printf "%-6s%3d%%%s", $1, 100 * (1 - (idle - I[$1]) / (t - T[$1])), (++n % 8 ? "  " : "\n")
            next
        }
        { T[$1] = t; I[$1] = idle }'
}

# Load, governor and current frequency of the given CPUs, and busy CPUs.
state() {
    echo "uptime:$(uptime)"
    for c in "$@"; do
        d=/sys/devices/system/cpu/cpu$c/cpufreq
        echo "cpu$c: governor $(cat "$d/scaling_governor"), scaling_cur_freq $(cat "$d/scaling_cur_freq") kHz"
    done
    echo "busy CPUs over one second:"
    busy
}

# One function from an assembly file, without directives, demangled.
asm_fn() {
    awk -v f="$2:" '$1 == f { p = 1 } p { print } p && /^\.Lfunc_end|^\.LFE|\.cfi_endproc/ { exit }' "$1" |
        grep -vE '^[[:space:]]+\.|^\.Lfunc_end|^\.LFE|^\.LFB' |
        c++filt | sed 's/\[[0-9a-f]\{16\}\]//g'
}

part1() {
    f=$RESULTS/p01-measured-nothing.txt
    $RUSTC -O p01/sum.rs -o $OUT/p01_sum
    $RUSTC -O --emit asm p01/sum.rs -o $OUT/p01_sum.s
    gcc -O2 -Wall -Wextra p01/sum.c -o $OUT/p01_sum_c
    gcc -O2 -S p01/sum.c -o $OUT/p01_sum_c.s
    {
        echo "# part 1: the benchmark that measured nothing"
        $RUSTC --version
        gcc --version | head -n 1
        state "$CPU"
        echo "== Rust, rustc -O: assembly of bench_unused"
        asm_fn $OUT/p01_sum.s bench_unused
        echo "== Rust, rustc -O: assembly of bench_printed_outlined"
        asm_fn $OUT/p01_sum.s bench_printed_outlined
        echo "== Rust, rustc -O: assembly of bench_black_box"
        asm_fn $OUT/p01_sum.s bench_black_box
        for run in 1 2 3; do
            echo "== Rust run $run, taskset -c $CPU"
            taskset -c "$CPU" $OUT/p01_sum
        done
        echo "== C, gcc -O2: assembly of bench_unused"
        asm_fn $OUT/p01_sum_c.s bench_unused
        echo "== C, gcc -O2: assembly of bench_volatile"
        asm_fn $OUT/p01_sum_c.s bench_volatile
        for run in 1 2 3; do
            echo "== C run $run, taskset -c $CPU"
            taskset -c "$CPU" $OUT/p01_sum_c
        done
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

# Median of the "median" column for each label and benchmark name, from lines
# that look like "<label> <name> min .. median <value> ...".
medians() {
    awk '{ for (i = 3; i < NF; i++) if ($i == "median") v[$1 " " $2] = v[$1 " " $2] " " $(i + 1) }
        END {
            for (k in v) {
                n = split(substr(v[k], 2), a, " ")
                for (i = 1; i <= n; i++) for (j = i + 1; j <= n; j++) if (a[j] < a[i]) { t = a[i]; a[i] = a[j]; a[j] = t }
                printf "%-28s %12.3f ns/call  (median of %d runs)\n", k, a[int((n + 1) / 2)], n
            }
        }' | sort
}

part2() {
    f=$RESULTS/p02-debug-build.txt
    for o in 0 1 2 3; do
        $RUSTC -C opt-level=$o p02/work.rs -o $OUT/p02_work_O$o
    done
    $RUSTC -C opt-level=0 --emit asm p02/work.rs -o $OUT/p02_work_O0.s
    $RUSTC -C opt-level=2 --emit asm p02/work.rs -o $OUT/p02_work_O2.s
    $RUSTC -C opt-level=3 --emit asm p02/work.rs -o $OUT/p02_work_O3.s
    for o in 0 2; do
        gcc -O$o -Wall p02/sum.c -o $OUT/p02_sum_c_O$o
        gcc -O$o -S p02/sum.c -o $OUT/p02_sum_c_O$o.s
    done
    {
        echo "# part 2: a debug build measures a different program"
        $RUSTC --version
        gcc --version | head -n 1
        cargo +1.98.0 --version
        state "$CPU"
        for round in 1 2 3; do
            for o in 0 1 2 3; do
                echo "== rustc -C opt-level=$o, round $round, taskset -c $CPU"
                taskset -c "$CPU" $OUT/p02_work_O$o | tee $OUT/p02_run.txt
                grep ' min ' $OUT/p02_run.txt | sed "s/^/opt-level=$o /" >> $OUT/p02_all.txt
            done
            for o in 0 2; do
                echo "== gcc -O$o, round $round, taskset -c $CPU"
                taskset -c "$CPU" $OUT/p02_sum_c_O$o
            done
        done
        echo "== summary: median of the medians"
        medians < $OUT/p02_all.txt
        rm -f $OUT/p02_all.txt $OUT/p02_run.txt
        for profile in "" "--release"; do
            echo "== taskset -c $CPU cargo test $profile -- --nocapture"
            taskset -c "$CPU" cargo +1.98.0 test --offline $profile \
                --manifest-path p02/cargo-bench/Cargo.toml --target-dir $OUT/p02-target \
                -- --nocapture 2>&1 | grep -E 'score|test result|profile'
        done
        echo "== rustc -C opt-level=0: assembly of sum_index"
        asm_fn $OUT/p02_work_O0.s sum_index
        echo "== rustc -C opt-level=2: assembly of sum_index"
        asm_fn $OUT/p02_work_O2.s sum_index
        echo "== rustc -C opt-level=0: assembly of score"
        asm_fn $OUT/p02_work_O0.s score
        echo "== rustc -C opt-level=2: assembly of score"
        asm_fn $OUT/p02_work_O2.s score
        echo "== rustc -O is -C opt-level=3; assembly at opt-level=2 against opt-level=3, labels ignored"
        $RUSTC --help | grep -E '^ +-O '
        for fn in sum_iter sum_index score; do
            asm_fn $OUT/p02_work_O2.s $fn | sed 's/LBB[0-9]*_/LBB_/g' > $OUT/p02_a2.txt
            asm_fn $OUT/p02_work_O3.s $fn | sed 's/LBB[0-9]*_/LBB_/g' > $OUT/p02_a3.txt
            if cmp -s $OUT/p02_a2.txt $OUT/p02_a3.txt; then echo "$fn: same"; else echo "$fn: different"; fi
        done
        for o in 0 2; do
            echo "== gcc -O$o: assembly of sum"
            asm_fn $OUT/p02_sum_c_O$o.s sum
        done
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part3() {
    f=$RESULTS/p03-closed-form.txt
    $RUSTC -O p03/closed.rs -o $OUT/p03_closed
    $RUSTC -O --emit asm p03/closed.rs -o $OUT/p03_closed.s
    $RUSTC -O --emit llvm-ir p03/closed.rs -o $OUT/p03_closed.ll
    {
        echo "# part 3: when the compiler computes the answer before the benchmark runs"
        $RUSTC --version
        state "$CPU"
        echo "== rustc -O: assembly of sum_below_1000 and sum_below_n"
        asm_fn $OUT/p03_closed.s sum_below_1000
        asm_fn $OUT/p03_closed.s sum_below_n
        echo "== rustc -O: LLVM IR of sum_below_n"
        sed -n '/^define.*@sum_below_n(/,/^}/p' $OUT/p03_closed.ll
        echo "== rustc -O: assembly of sum_array"
        asm_fn $OUT/p03_closed.s sum_array
        echo "== LLVM passes that changed sum_below_n (below_lib.rs), and where the 65-bit multiplication appears"
        $RUSTC -O --crate-type lib --emit llvm-ir -C llvm-args=-print-changed=quiet \
            -C llvm-args=-filter-print-funcs=sum_below_n p03/below_lib.rs -o $OUT/p03_below_lib.ll 2>&1 |
            grep -E 'IR Dump After|mul i65' | sed -n '1,/mul i65/p'
        for run in 1 2 3; do
            echo "== run $run, taskset -c $CPU"
            taskset -c "$CPU" $OUT/p03_closed
        done
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part4() {
    f=$RESULTS/p04-first-run.txt
    $RUSTC -O p04/first.rs -o $OUT/p04_first
    $RUSTC -O p04/launch.rs -o $OUT/p04_launch
    gcc -O2 -Wall -Wextra p04/lazy.c -o $OUT/p04_lazy
    {
        echo "# part 4: why the first run is slower"
        $RUSTC --version
        gcc --version | head -n 1
        state "$CPU"
        echo "== one fresh process, taskset -c $CPU, iterations 1 to 5, 10 and 50"
        taskset -c "$CPU" $OUT/p04_first natural,detail
        echo "== 10 rounds, every mode in its own fresh process, taskset -c $CPU"
        for round in 1 2 3 4 5 6 7 8 9 10; do
            for mode in natural prefault prefault,evict prefault,spin prefault,sleep prefault,spin,touch; do
                taskset -c "$CPU" $OUT/p04_first $mode
            done
        done | tee $OUT/p04_modes.txt
        echo "== median over the 10 processes of each mode"
        awk '{ m[$1]++; k = $1 SUBSEP m[$1]; i1[k] = $3; fl[k] = $6; i2[k] = $8; i10[k] = $11; st[k] = $14 }
            function med(a, mode, n,   i, j, t, v) {
                for (i = 1; i <= n; i++) v[i] = a[mode SUBSEP i] + 0
                for (i = 1; i <= n; i++) for (j = i + 1; j <= n; j++) if (v[j] < v[i]) { t = v[i]; v[i] = v[j]; v[j] = t }
                return (v[int((n + 1) / 2)] + v[int(n / 2) + 1]) / 2
            }
            END {
                for (mode in m) printf "%-20s iter1 %7d ns  faults %3d  iter2 %7d ns  iter10 %7d ns  steady %7d ns\n",
                    mode, med(i1, mode, m[mode]), med(fl, mode, m[mode]), med(i2, mode, m[mode]), med(i10, mode, m[mode]), med(st, mode, m[mode])
            }' $OUT/p04_modes.txt | sort
        echo "== readelf -d: FLAGS of the Rust binary and of the C binary"
        readelf -d $OUT/p04_first | grep FLAGS
        readelf -d $OUT/p04_lazy | grep FLAGS
        echo "== C, lazy binding: 5 fresh processes, taskset -c $CPU"
        for run in 1 2 3 4 5; do taskset -c "$CPU" $OUT/p04_lazy; done
        echo "== C, LD_BIND_NOW=1: 5 fresh processes, taskset -c $CPU"
        for run in 1 2 3 4 5; do LD_BIND_NOW=1 taskset -c "$CPU" $OUT/p04_lazy; done
        echo "== whole fresh processes that do the work once, timed from outside, taskset -c $CPU"
        taskset -c "$CPU" $OUT/p04_launch 20 $OUT/p04_first once
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

# Medians of consecutive windows of 100 batches, from "... N.NN ns per call" lines.
windows() {
    awk '/^\[|^batch/ && /ns per call/ { v[++n] = $(NF - 3) }
        END {
            for (w = 0; w * 100 < n; w++) {
                m = 0
                for (i = w * 100 + 1; i <= w * 100 + 100 && i <= n; i++) a[++m] = v[i] + 0
                for (i = 1; i <= m; i++) for (j = i + 1; j <= m; j++) if (a[j] < a[i]) { t = a[i]; a[i] = a[j]; a[j] = t }
                printf "%s%.2f", (w ? " " : ""), a[int((m + 1) / 2)]
            }
            print ""
        }'
}

part5() {
    f=$RESULTS/p05-jit-warmup.txt
    t=$RESULTS/p05-jit-timeline.txt
    jcpus=${JCPUS:-$CPU,4}
    node22=${NODE22:-$HOME/.nvm/versions/node/v22.23.1/bin/node}
    mkdir -p $OUT/p05
    javac -d $OUT/p05 p05/Warmup.java
    {
        echo "# part 5: three more thresholds of the same JVM"
        java -version 2>&1 | head -n 1
        java -XX:+PrintFlagsFinal -version 2>/dev/null |
            grep -E ' (Tier3MinInvocationThreshold|Tier3CompileThreshold|Tier3BackEdgeThreshold) '
    } > $RESULTS/p05-jit-flags.txt
    {
        echo "# part 5: JIT warmup"
        java -version 2>&1
        java -XX:+PrintFlagsFinal -version 2>/dev/null |
            grep -E ' (TieredCompilation|Tier3InvocationThreshold|Tier4InvocationThreshold|CICompilerCount) '
        state $(echo "$jcpus" | tr ',' ' ')
        echo "== one JVM, taskset -c $jcpus, 600 batches of 1000 calls, timeline in $(basename "$t")"
        taskset -c "$jcpus" java -Xlog:jit+compilation=debug:file=$OUT/p05_jit.log:uptimenanos \
            -cp $OUT/p05 Warmup 600 1000 timeline > $OUT/p05_batches.txt
        tail -n 1 $OUT/p05_batches.txt
        {
            grep 'Warmup::' $OUT/p05_jit.log | sed 's/^\[\([0-9]*\)ns\] */\1 JIT  /'
            grep '^\[' $OUT/p05_batches.txt | sed 's/^\[\([0-9]*\)ns\] */\1 /'
        } | sort -n | awk '{ t = $1; $1 = ""; printf "%10.3f ms %s\n", t / 1e6, $0 }' > "$t"
        echo "== 10 fresh JVMs, taskset -c $jcpus, 3000 batches of 1000 calls; medians of windows of 100 batches"
        for run in 1 2 3 4 5 6 7 8 9 10; do
            taskset -c "$jcpus" java -Xlog:jit+compilation=debug:file=$OUT/p05_run.log:uptimenanos \
                -cp $OUT/p05 Warmup 3000 1000 timeline > $OUT/p05_run.txt
            tail -n 1 $OUT/p05_run.txt
            windows < $OUT/p05_run.txt
            last=$(grep 'Warmup::' $OUT/p05_run.log | tail -n 1 | sed 's/^\[\([0-9]*\)ns\].*/\1/')
            awk -v last="$last" '/^\[/ { t = substr($1, 2) + 0; if (t >= last) { printf "last compile event of Warmup at %.3f ms, during batch %d\n", last / 1e6, $3; exit } }' $OUT/p05_run.txt
        done
        echo "== 8 rounds, interleaved, taskset -c $jcpus, 3000 batches of 1000 calls: median of the last 100 batches"
        for round in 1 2 3 4 5 6 7 8; do
            for opt in default -XX:TieredStopAtLevel=1 -XX:-TieredCompilation; do
                o=$opt
                [ "$opt" = default ] && o=""
                printf '%-26s %s\n' "$opt" "$(taskset -c "$jcpus" java $o -cp $OUT/p05 Warmup 3000 1000 |
                    sed 's/.*last 100 batches *//; s/ (median).*//')"
            done
        done | tee $OUT/p05_levels.txt
        echo "== median over the 8 rounds"
        awk '{ v[$1] = v[$1] " " $2 }
            END {
                for (k in v) {
                    n = split(substr(v[k], 2), a, " ")
                    for (i = 1; i <= n; i++) for (j = i + 1; j <= n; j++) if (a[j] + 0 < a[i] + 0) { t = a[i]; a[i] = a[j]; a[j] = t }
                    printf "%-26s %.2f ns per call\n", k, (a[n / 2] + a[n / 2 + 1]) / 2
                }
            }' $OUT/p05_levels.txt | sort
        echo "== 3 fresh JVMs with -Xint, taskset -c $jcpus, 300 batches of 1000 calls"
        for run in 1 2 3; do
            taskset -c "$jcpus" java -Xint -cp $OUT/p05 Warmup 300 1000
        done
        if [ -x "$node22" ]; then
            echo "== node $("$node22" --version), taskset -c $jcpus, --trace-opt --trace-deopt, 40 batches of 1000 calls"
            taskset -c "$jcpus" "$node22" --trace-opt --trace-deopt p05/warmup.js 40 1000
            echo "== node, 3000 batches of 1000 calls; medians of windows of 100 batches"
            taskset -c "$jcpus" "$node22" p05/warmup.js 3000 1000 | windows
        fi
        state $(echo "$jcpus" | tr ',' ' ')
    } > "$f"
    echo "wrote $f"
}

# Medians of the first 500 ms and of each phase of 10 s of a p06 trace of $2 seconds.
phases() {
    awk -v secs="$2" 'NR > 3 {
            if ($1 <= 500) p = -1
            else { p = int(($1 - 1) / 10000); if (p >= secs / 10) p = secs / 10 - 1 }
            load[p] = $2; n[p]++
            f[p, n[p]] = $3; t[p, n[p]] = $4; k[p, n[p]] = $5; w[p, n[p]] = $6; c[p, n[p]] = $7
            if (p > last) last = p
        }
        function med(a, p, m,   i, j, x, v) {
            for (i = 1; i <= m; i++) v[i] = a[p, i] + 0
            for (i = 1; i <= m; i++) for (j = i + 1; j <= m; j++) if (v[j] < v[i]) { x = v[i]; v[i] = v[j]; v[j] = x }
            return v[int((m + 1) / 2)]
        }
        END {
            print "phase      load  freq_MHz  core_C  pkg_C  iter_per_us  iter_per_cycle  (medians)"
            for (p = -1; p <= last; p++)
                printf "%-10s %-4s %9.0f %7.0f %6.0f %12.1f %15.3f\n", (p < 0 ? "0-0.5 s" : (p == 0 ? "0.5" : 10 * p) "-" 10 * p + 10 " s"), load[p],
                    med(f, p, n[p]), med(t, p, n[p]), med(k, p, n[p]), med(w, p, n[p]), med(c, p, n[p])
        }' "$1"
}

part6() {
    f=$RESULTS/p06-cpu-speed.txt
    $RUSTC -O p06/freq.rs -o $OUT/p06_freq
    {
        echo "# part 6: my laptop changed its CPU speed during the benchmark"
        $RUSTC --version
        state "$CPU" "$ECPU"
        d=/sys/devices/system/cpu/cpu$CPU/cpufreq
        echo "cpu$CPU: driver $(cat $d/scaling_driver), energy_performance_preference $(cat $d/energy_performance_preference)," \
            "cpuinfo_max_freq $(cat $d/cpuinfo_max_freq) kHz, no_turbo $(cat /sys/devices/system/cpu/intel_pstate/no_turbo)," \
            "AC online $(cat /sys/class/power_supply/AC/online 2>/dev/null || echo unknown)"
        echo "== the chain in the worker loop (rustc -O)"
        $RUSTC -O --emit asm p06/freq.rs -o $OUT/p06_freq.s
        awk '/\$1442695040888963407/ { p = 1 } p { print; if (++n == 8) exit }' $OUT/p06_freq.s | grep -vE '^[[:space:]]+\.'
        echo "== 5 starts after 3 s of sleep: worker on cpu $CPU for 1 s, samples at 5, 10, 20, 40, 60, 80 and 100 ms"
        for start in 1 2 3 4 5; do
            sleep 3
            $OUT/p06_freq "$CPU" "$ECPU" 1 > $OUT/p06_start.txt
            printf 'start %s: %s | ' "$start" "$(sed -n '2p' $OUT/p06_start.txt | sed 's/before the start: //')"
            awk 'NR == 4 || NR == 5 || NR == 7 || NR == 11 || NR == 15 || NR == 19 || NR == 23 {
                    printf "%s ms %s MHz  ", $1, $3 } END { print "" }' $OUT/p06_start.txt
        done
        for run in alone load; do
            extra=""
            [ $run = load ] && extra=11,12,13,14,15
            echo "== sleep 3 s, then 60 s: worker on cpu $CPU, sampler on cpu $ECPU, extra load: ${extra:-none} (trace in p06-trace-$run.txt)"
            sleep 3
            $OUT/p06_freq "$CPU" "$ECPU" 60 $extra > $RESULTS/p06-trace-$run.txt
            sed -n '2p' $RESULTS/p06-trace-$run.txt
            echo "-- the first 100 ms"
            sed -n '3,23p' $RESULTS/p06-trace-$run.txt
            echo "-- per phase of 10 s"
            phases $RESULTS/p06-trace-$run.txt 60
        done
        state "$CPU" "$ECPU"
    } > "$f"
    echo "wrote $f"
}

# Median of the sum, the chain and the frequency for each label before "sum".
labels() {
    awk '{
            i = index($0, " sum "); k = substr($0, 1, i - 1); gsub(/ +/, " ", k)
            for (j = 1; j < NF; j++) {
                if ($j == "sum") s = $(j + 1)
                if ($j == "chain") c = $(j + 1)
                if ($(j + 1) == "MHz") m = $j
            }
            n[k]++; S[k, n[k]] = s; C[k, n[k]] = c; M[k, n[k]] = m
        }
        function med(a, k, m,   i, j, x, v) {
            for (i = 1; i <= m; i++) v[i] = a[k, i] + 0
            for (i = 1; i <= m; i++) for (j = i + 1; j <= m; j++) if (v[j] < v[i]) { x = v[i]; v[i] = v[j]; v[j] = x }
            return (v[int((m + 1) / 2)] + v[int(m / 2) + 1]) / 2
        }
        END {
            for (k in n) printf "%-22s sum %8.1f ns  chain %8.1f ns  %5.0f MHz  (median of %d)\n", k, med(S, k, n[k]), med(C, k, n[k]), med(M, k, n[k]), n[k]
        }' "$1" | sort
}

part7() {
    f=$RESULTS/p07-efficiency-core.txt
    $RUSTC -O p07/cores.rs -o $OUT/p07_cores
    $RUSTC -O --emit asm p07/cores.rs -o $OUT/p07_cores.s
    {
        echo "# part 7: the benchmark ran on an efficiency core"
        $RUSTC --version
        state 2 3 4 6 10 14
        echo "== the chain as compiled: one multiply-add for 8 turns"
        l=$(grep -n -m 1 'movl	\$10000, %e' $OUT/p07_cores.s | cut -d: -f1)
        sed -n "$((l - 9)),$((l + 8))p" $OUT/p07_cores.s | grep -vE '^[[:space:]]+\.'
        $OUT/p07_cores consts
        echo "== 10 rounds, pinned: P-cores 2 and 6, E-cores 10 and 14"
        for round in 1 2 3 4 5 6 7 8 9 10; do
            for cpu in 2 10 6 14; do
                $OUT/p07_cores pinned $cpu
            done
        done | tee $OUT/p07_pinned.txt
        echo "== median per cpu"
        labels $OUT/p07_pinned.txt
        echo "== P-cores only, split by how busy the sibling thread was during the run"
        awk '/sibling/ { pct = $(NF) + 0; state = (pct < 20) ? "idle" : (pct > 50 ? "busy" : "partly busy")
                         sub(/ +sum /, " sibling " state " sum "); print }' $OUT/p07_pinned.txt > $OUT/p07_split.txt
        labels $OUT/p07_split.txt
        echo "== 30 runs without taskset"
        for run in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do
            $OUT/p07_cores unpinned
        done | tee $OUT/p07_unpinned.txt
        echo "== without taskset: the sum, in bins of 25 ns, and the cpu at the end of the run"
        awk '{ for (j = 1; j < NF; j++) if ($j == "sum") s = $(j + 1); b = int(s / 25) * 25; h[b] = h[b] "#"
               t = ($4 < 8) ? "P" : "E"; c[b] = c[b] t
               if (b < lo || lo == "") lo = b; if (b > hi) hi = b }
            END { for (b = lo; b <= hi; b += 25) printf "%4d-%4d ns  %-30s %s\n", b, b + 25, h[b], c[b] }' $OUT/p07_unpinned.txt
        awk '{ for (j = 1; j < NF; j++) if ($j == "sum") v[++n] = $(j + 1); t += v[n]; if ($2 >= 8) e++; if ($4 < 8) p++ }
            END {
                for (i = 1; i <= n; i++) for (j = i + 1; j <= n; j++) if (v[j] + 0 < v[i] + 0) { x = v[i]; v[i] = v[j]; v[j] = x }
                printf "sum: mean %.1f ns, median %.1f ns; %d of %d runs started on an E-core, %d ended on a P-core\n",
                    t / n, (v[int((n + 1) / 2)] + v[int(n / 2) + 1]) / 2, e, n, p
            }' $OUT/p07_unpinned.txt
        echo "== 10 rounds: cpu 2 alone, two threads on cpus 2+3 (one core), two threads on cpus 2+4 (two cores)"
        for round in 1 2 3 4 5 6 7 8 9 10; do
            $OUT/p07_cores pinned 2
            $OUT/p07_cores pair 2 3
            $OUT/p07_cores pair 2 4
        done | tee $OUT/p07_pairs.txt
        echo "== medians"
        labels $OUT/p07_pairs.txt
        state 2 3 4 6 10 14
    } > "$f"
    echo "wrote $f"
}

part8() {
    f=$RESULTS/p08-average-and-tail.txt
    $RUSTC -O p08/push.rs -o $OUT/p08_push
    $RUSTC -O p08/requests.rs -o $OUT/p08_requests
    {
        echo "# part 8: the average hides the slow requests"
        $RUSTC --version
        echo "transparent huge pages: $(cat /sys/kernel/mm/transparent_hugepage/enabled)"
        state "$CPU"
        for round in 1 2; do
            for mode in grow reserved touched grow,nothp reserved,nothp; do
                echo "== round $round: $mode, taskset -c $CPU"
                echo "free blocks per order 0-10 before the run, $(grep Normal /proc/buddyinfo | sed 's/  */ /g')"
                taskset -c "$CPU" $OUT/p08_push $mode
            done
        done
        echo "== strace: anonymous mmap of 100 KB and more, and mremap, in one growing run"
        strace -e trace=mmap,mremap,munmap,brk $OUT/p08_push grow 2>&1 >/dev/null |
            grep -E 'mremap|mmap\(NULL, [0-9]{6,}, .*MAP_ANONYMOUS'
        for run in 1 2 3; do
            echo "== requests, run $run, taskset -c $CPU"
            taskset -c "$CPU" $OUT/p08_requests
        done
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part9() {
    f=$RESULTS/p09-coordinated-omission.txt
    $RUSTC -O p09/co.rs -o $OUT/p09_co
    {
        echo "# part 9: coordinated omission"
        $RUSTC --version
        state 2 4 6
        echo "server on 127.0.0.1: answers 8-byte requests, and stalls 500 ms every 5 s (at 2.5, 7.5, 12.5 and 17.5 s)"
        for mode in closed paced open; do
            echo "== $mode, 20 s, taskset -c 2,4,6"
            taskset -c 2,4,6 $OUT/p09_co $mode
        done
        state 2 4 6
    } > "$f"
    echo "wrote $f"
}

part10() {
    f=$RESULTS/p10-clocks.txt
    gcc -O2 -Wall -Wextra p10/clocks.c -o $OUT/p10_clocks
    $RUSTC -O p10/instant.rs -o $OUT/p10_instant
    cs=/sys/devices/system/clocksource/clocksource0
    {
        echo "# part 10: which clock to use when you measure time"
        $RUSTC --version
        gcc --version | head -n 1
        state "$CPU"
        echo "clocksource: current $(cat $cs/current_clocksource), available $(cat $cs/available_clocksource)"
        echo "cpu flags: $(grep -o -w -E 'constant_tsc|nonstop_tsc|tsc_known_freq' /proc/cpuinfo | sort -u | tr '\n' ' ')"
        echo "kernel timer: $( (zcat /proc/config.gz 2>/dev/null || cat /boot/config-"$(uname -r)" 2>/dev/null) | grep -E '^CONFIG_HZ=' || echo unknown)"
        echo "== timedatectl status, synchronization lines only"
        timedatectl status 2>/dev/null | grep -E 'synchronized|NTP service' || echo "timedatectl not available"
        echo "== timedatectl timesync-status, last answer of the NTP server"
        timedatectl timesync-status 2>/dev/null | grep -E 'Poll interval|Offset|Delay|Jitter' || echo "timesync-status not available"
        echo "== C: every clock, 1,000,000 calls each, taskset -c $CPU"
        taskset -c "$CPU" $OUT/p10_clocks table
        echo "== strace -c: system calls made by 1000 calls of each clock"
        i=0
        for name in CLOCK_REALTIME CLOCK_MONOTONIC CLOCK_MONOTONIC_RAW CLOCK_BOOTTIME CLOCK_REALTIME_COARSE \
            CLOCK_MONOTONIC_COARSE CLOCK_PROCESS_CPUTIME_ID CLOCK_THREAD_CPUTIME_ID; do
            n=$(strace -c -e trace=clock_gettime $OUT/p10_clocks calls $i 2>&1 >/dev/null |
                awk '$NF == "clock_gettime" { print $4 }')
            printf '%-26s %s system calls\n' "$name" "${n:-0}"
            i=$((i + 1))
        done
        echo "== MONOTONIC against MONOTONIC_RAW over 20 s"
        $OUT/p10_clocks drift 20
        echo "== BOOTTIME against MONOTONIC"
        $OUT/p10_clocks boottime
        echo "== Rust, taskset -c $CPU"
        taskset -c "$CPU" $OUT/p10_instant
        echo "== $(python3 --version), taskset -c $CPU"
        taskset -c "$CPU" python3 p10/clocks.py
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part11() {
    f=$RESULTS/p11-faster-than-the-clock.txt
    $RUSTC -O p11/fast.rs -o $OUT/p11_fast
    $RUSTC -O --emit asm p11/fast.rs -o $OUT/p11_fast.s
    {
        echo "# part 11: measuring something faster than the clock"
        $RUSTC --version
        state "$CPU"
        echo "== rustc -O: assembly of independent and dependent"
        asm_fn $OUT/p11_fast.s independent
        asm_fn $OUT/p11_fast.s dependent
        for run in 1 2 3; do
            echo "== run $run, taskset -c $CPU: ns per call, K calls per timing sample"
            taskset -c "$CPU" $OUT/p11_fast
        done
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part12() {
    f=$RESULTS/p12-how-many-runs.txt
    $RUSTC -O p12/sort.rs -o $OUT/p12_sort
    {
        echo "# part 12: how many benchmark runs are enough"
        $RUSTC --version
        python3 --version
        state "$CPU"
        for set in 1 2 3; do
            [ $set -gt 1 ] && sleep 20
            echo "== set $set: 100 fresh processes, taskset -c $CPU, one sort each (ms and MHz in p12-times-$set.txt)"
            run=1
            while [ $run -le 100 ]; do
                taskset -c "$CPU" $OUT/p12_sort
                run=$((run + 1))
            done > $RESULTS/p12-times-$set.txt
            uptime
        done
        echo "== analysis of set 1, and a summary of the three sets"
        python3 p12/stats.py $RESULTS/p12-times-1.txt $RESULTS/p12-times-2.txt $RESULTS/p12-times-3.txt
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

# Runs one version: prints its label and the time of one sort.
one() {
    printf '%s %s\n' "$1" "$(taskset -c "$CPU" $OUT/p13_$1)"
}

part13() {
    f=$RESULTS/p13-interleaving.txt
    raw=$RESULTS/p13
    mkdir -p "$raw"
    $RUSTC -O p13/sort.rs -o $OUT/p13_A
    cp $OUT/p13_A $OUT/p13_B
    $RUSTC -O --cfg bigger p13/sort.rs -o $OUT/p13_C
    {
        echo "# part 13: compare two versions by interleaving the runs"
        $RUSTC --version
        python3 --version
        echo "A and B: two copies of the same binary (cmp: $(cmp -s $OUT/p13_A $OUT/p13_B && echo identical || echo different)), 1,000,000 values; C: 1,040,000 values"
        state "$CPU"
        for rep in 1 2 3 4 5; do
            for pair in AB AC; do
                first=$(echo $pair | cut -c1)
                second=$(echo $pair | cut -c2)
                i=0; while [ $i -lt 50 ]; do one $first; i=$((i + 1)); done > $raw/rep$rep-$pair-blocks.txt
                i=0; while [ $i -lt 50 ]; do one $second; i=$((i + 1)); done >> $raw/rep$rep-$pair-blocks.txt
                i=0; while [ $i -lt 50 ]; do one $first; one $second; i=$((i + 1)); done > $raw/rep$rep-$pair-interleaved.txt
            done
            echo "repetition $rep done:$(uptime)"
        done
        echo "== 50 runs of each version per experiment; blocks: all of the first, then all of the second;"
        echo "   interleaved: first, second, first, second; difference = second / first - 1"
        python3 p13/compare.py $raw/rep*-AB-blocks.txt $raw/rep*-AB-interleaved.txt $raw/rep*-AC-blocks.txt $raw/rep*-AC-interleaved.txt
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

# The environment padding sizes of one pass: 1 forward, 2 backward, 3 in a fixed shuffled order.
pads() {
    i=0
    while [ $i -lt 256 ]; do
        case $1 in
            1) echo $((i * 16)) ;;
            2) echo $(((255 - i) * 16)) ;;
            3) echo $(((i * 97 % 256) * 16)) ;;
        esac
        i=$((i + 1))
    done
}

part14() {
    f=$RESULTS/p14-environment.txt
    raw=$RESULTS/p14-scan.txt
    gcc -O2 -Wall -Wextra p14/envstack.c -o $OUT/p14_envstack
    {
        echo "# part 14: can environment variables change how fast your code runs?"
        gcc --version | head -n 1
        state "$CPU"
        echo "== env -i PAD=<n bytes> setarch $(uname -m) -R taskset -c $CPU: the address of a local variable"
        for pad in 0 1 15 16 17 32 4096; do
            printf 'pad %4d: ' $pad
            env -i PAD="$(printf "%${pad}s" '' | tr ' ' x)" setarch "$(uname -m)" -R taskset -c "$CPU" $OUT/p14_envstack fib
        done
        echo "== 3 passes over 256 sizes (0 to 4080 bytes, step 16), both workloads at each size (raw lines in $(basename "$raw"))"
        for pass in 1 2 3; do
            for pad in $(pads $pass); do
                for w in copy fib; do
                    env -i PAD="$(printf "%${pad}s" '' | tr ' ' x)" setarch "$(uname -m)" -R taskset -c "$CPU" $OUT/p14_envstack $w |
                        awk -v p=$pass -v pad=$pad '{ print p, pad, $3, $1, $4 }'
                done
            done
            echo "pass $pass done:$(uptime)"
        done > "$raw.tmp"
        grep 'pass .* done' "$raw.tmp"
        grep -v 'done' "$raw.tmp" > "$raw"
        rm "$raw.tmp"
        python3 p14/analyze.py "$raw"
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part15() {
    f=$RESULTS/p15-code-alignment.txt
    {
        echo "# part 15: the same loop in plain C, gcc -O2 -fno-tree-vectorize -fno-align-loops -S, lines before the loop"
        gcc --version | head -n 1
        gcc -O2 -fno-tree-vectorize -fno-align-loops -S p15/plain.c -o $OUT/p15_plain.s
        grep -B3 -A2 'p2align' $OUT/p15_plain.s
    } > $RESULTS/p15-gcc-loop-alignment.txt
    gcc -O2 -Wall -Wextra p15/align.c -o $OUT/p15_align
    objdump -d --no-show-raw-insn $OUT/p15_align |
        awk '/<[ab][0-9]+>:$/ { name = $2; gsub(/[<>:]/, "", name) }
             /jne +[0-9a-f]+ </ && name != "" { printf "%s %d\n", name, strtonum("0x" $(NF - 1)) % 64; name = "" }' > $OUT/p15_offsets.txt
    {
        echo "# part 15: does code alignment change the speed of the same code?"
        gcc --version | head -n 1
        state 2 6
        echo "== objdump: start of the loop modulo 64, for each padding (copy a and copy b)"
        awk '{ o[$1] = $2 } END { for (p = 0; p < 64; p++) printf "pad %2d: %2d %2d%s", p, o["a" p], o["b" p], (p % 8 == 7 ? "\n" : "   ") }' $OUT/p15_offsets.txt
        echo "== objdump: the loop of a3"
        objdump -d --no-show-raw-insn $OUT/p15_align | awk '/<a3>:$/, /ret/'
        for run in 1 2 3; do
            cpu=2
            [ $run = 3 ] && cpu=6
            echo "== run $run, taskset -c $cpu: 21 rounds, the 128 functions in a new shuffled order in each round"
            taskset -c $cpu $OUT/p15_align | tee $OUT/p15_run$run.txt
        done
        echo "== summary"
        python3 p15/summary.py $OUT/p15_offsets.txt $OUT/p15_run1.txt $OUT/p15_run2.txt $OUT/p15_run3.txt
        state 2 6
    } > "$f"
    echo "wrote $f"
}

part16() {
    f=$RESULTS/p16-working-set.txt
    $RUSTC -O p16/chase.rs -o $OUT/p16_chase
    {
        echo "# part 16: when the working set no longer fits in cache"
        $RUSTC --version
        echo "transparent huge pages: $(cat /sys/kernel/mm/transparent_hugepage/enabled)"
        for c in 2 10; do
            for i in 0 2 3; do
                d=/sys/devices/system/cpu/cpu$c/cache/index$i
                printf 'cpu%s: L%s %s cache %s, shared by cpus %s\n' $c "$(cat $d/level)" "$(cat $d/type)" "$(cat $d/size)" "$(cat $d/shared_cpu_list)"
            done
        done
        state 2 10
        args=""
        for round in 1 2 3; do
            echo "== round $round: P-core (taskset -c 2), E-core (taskset -c 10), P-core without huge pages"
            echo "free blocks per order 0-10, $(grep Normal /proc/buddyinfo | sed 's/  */ /g')"
            taskset -c 2 $OUT/p16_chase > $OUT/p16_p$round.txt
            taskset -c 10 $OUT/p16_chase > $OUT/p16_e$round.txt
            taskset -c 2 $OUT/p16_chase nothp > $OUT/p16_n$round.txt
            args="$args P-core=$OUT/p16_p$round.txt E-core=$OUT/p16_e$round.txt P-core,nothp=$OUT/p16_n$round.txt"
            uptime
        done
        echo "== round 1, P-core, the full table"
        cat $OUT/p16_p1.txt
        echo "== summary of the three rounds"
        python3 p16/summary.py $args
        state 2 10
    } > "$f"
    echo "wrote $f"
}

part17() {
    f=$RESULTS/p17-sorted-data.txt
    for o in 1 3; do
        $RUSTC -C opt-level=$o p17/branch.rs -o $OUT/p17_O$o
        $RUSTC -C opt-level=$o --emit asm p17/branch.rs -o $OUT/p17_O$o.s
    done
    {
        echo "# part 17: why sorted data can make the same loop faster"
        $RUSTC --version
        state "$CPU"
        for fn in sum_filter sum_if sum_if_effect; do
            echo "== rustc -C opt-level=3 (the same as -O): assembly of $fn"
            asm_fn $OUT/p17_O3.s $fn
        done
        echo "== rustc -C opt-level=1: assembly of sum_if_effect"
        asm_fn $OUT/p17_O1.s sum_if_effect
        for run in 1 2 3; do
            for o in 3 1; do
                echo "== run $run, opt-level=$o, taskset -c $CPU: ns per byte, 32 KiB of random or sorted bytes"
                taskset -c "$CPU" $OUT/p17_O$o
            done
        done
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part18() {
    f=$RESULTS/p18-allocator.txt
    $RUSTC -O p18/alloc.rs -o $OUT/p18_alloc
    {
        echo "# part 18: the benchmark measured the allocator"
        $RUSTC --version
        ldd --version | head -n 1
        for c in 0 1 2 3 4 5 6 7; do
            echo "cpu$c shares its core with CPUs $(cat /sys/devices/system/cpu/cpu$c/topology/thread_siblings_list)"
        done
        state 0 2 4 6
        for run in 1 2 3; do
            echo "== run $run, a fresh process, taskset -c $CPU"
            taskset -c "$CPU" $OUT/p18_alloc single
        done
        for which in new reuse; do
            echo "== strace -c: 1000 calls of the 256 KiB function, $which"
            strace -c -e trace=mmap,munmap,brk,mremap,madvise $OUT/p18_alloc strace $which 2>&1 >/dev/null
        done
        echo "== small strings in several threads, each thread pinned to its own CPU, medians of the threads"
        for round in 1 2 3; do
            echo "== round $round"
            for counter in shared per-thread off; do
                for cpus in "$CPU" 0,2,4,6 0,1,2,3,4,5,6,7; do
                    $OUT/p18_alloc threads "$cpus" "$counter"
                done
            done
        done
        state 0 2 4 6
    } > "$f"
    echo "wrote $f"
}

part19() {
    f=$RESULTS/p19-microbenchmark-and-program.txt
    $RUSTC -O p19/table.rs -o $OUT/p19_table
    {
        echo "# part 19: the microbenchmark won and the program got slower"
        $RUSTC --version
        for i in 0 1 2 3; do
            d=/sys/devices/system/cpu/cpu$CPU/cache/index$i
            echo "cpu$CPU cache: level $(cat $d/level) $(cat $d/type) $(cat $d/size), shared by CPUs $(cat $d/shared_cpu_list)"
        done
        state "$CPU"
        for round in 1 2 3; do
            for mode in micro program stream; do
                echo "== round $round, $mode, taskset -c $CPU"
                taskset -c "$CPU" $OUT/p19_table $mode
            done
        done
        state "$CPU"
    } > "$f"
    echo "wrote $f"
}

part20() {
    f=$RESULTS/p20-machine.txt
    p=/sys/devices/system/cpu
    {
        echo "# part 20: the machine and its settings"
        grep -m 1 'model name' /proc/cpuinfo | sed 's/^model name[[:space:]]*:/cpu:/'
        grep -m 1 '^microcode' /proc/cpuinfo | sed 's/[[:space:]]*:/:/'
        echo "kernel: $(uname -sr)"
        grep MemTotal /proc/meminfo
        n=$(getconf _NPROCESSORS_ONLN)
        c=0
        while [ "$c" -lt "$n" ]; do
            d=$p/cpu$c
            echo "cpu$c: max $(cat $d/cpufreq/cpuinfo_max_freq) kHz, base $(cat $d/cpufreq/base_frequency) kHz, core shared with CPUs $(cat $d/topology/thread_siblings_list), governor $(cat $d/cpufreq/scaling_governor), energy_performance_preference $(cat $d/cpufreq/energy_performance_preference)"
            c=$((c + 1))
        done
        echo "intel_pstate: status $(cat $p/intel_pstate/status), no_turbo $(cat $p/intel_pstate/no_turbo), min_perf_pct $(cat $p/intel_pstate/min_perf_pct), max_perf_pct $(cat $p/intel_pstate/max_perf_pct)"
        echo "transparent huge pages: enabled $(cat /sys/kernel/mm/transparent_hugepage/enabled), defrag $(cat /sys/kernel/mm/transparent_hugepage/defrag)"
        echo "clocksource: $(cat /sys/devices/system/clocksource/clocksource0/current_clocksource)"
        echo "randomize_va_space: $(cat /proc/sys/kernel/randomize_va_space)"
        $RUSTC --version --verbose | grep -E '^(rustc|host|LLVM version)'
        gcc --version | head -n 1
        ldd --version | head -n 1
        python3 --version
        state "$CPU"
    } > "$f"
    echo "wrote $f"
    main=$RESULTS
    RESULTS=$main/p20-rerun
    mkdir -p "$RESULTS"
    part1
    part17
    RESULTS=$main
    mkdir -p "$RESULTS/p20-raw"
    RAW_DIR=$RESULTS/p20-raw taskset -c "$CPU" $OUT/p01_sum > "$RESULTS/p20-raw/p01-run.txt"
    python3 p20/compare.py results "$RESULTS/p20-rerun" "$RESULTS/p20-raw" > "$RESULTS/p20-rerun.txt"
    echo "wrote $RESULTS/p20-rerun.txt"
}

parts=${*:-1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20}
for n in $parts; do
    "part$n"
done
