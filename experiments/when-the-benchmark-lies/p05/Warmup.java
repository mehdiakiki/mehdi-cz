import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.util.Arrays;

public class Warmup {
    static long mix(long x) {
        x ^= x >>> 33;
        x *= 0xff51afd7ed558ccdL;
        x ^= x >>> 33;
        x *= 0xc4ceb9fe1a85ec53L;
        x ^= x >>> 33;
        return x;
    }

    static long batch(int calls, long seed) {
        long sink = seed;
        for (int i = 0; i < calls; i++) {
            sink += mix(sink + i);
        }
        return sink;
    }

    public static void main(String[] args) {
        int batches = Integer.parseInt(args[0]);
        int calls = Integer.parseInt(args[1]);
        boolean timeline = args.length > 2 && args[2].equals("timeline");

        RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();
        long tick = runtime.getUptime();
        long uptimeMs;
        do {
            uptimeMs = runtime.getUptime();
        } while (uptimeMs == tick);
        long origin = System.nanoTime();

        double[] nsPerCall = new double[batches];
        long[] endUptimeNs = new long[batches];
        long sink = 0;
        for (int b = 0; b < batches; b++) {
            long start = System.nanoTime();
            sink = batch(calls, sink);
            long end = System.nanoTime();
            nsPerCall[b] = (double) (end - start) / calls;
            endUptimeNs[b] = uptimeMs * 1_000_000 + (end - origin);
        }

        if (timeline) {
            for (int b = 0; b < batches; b++) {
                System.out.printf("[%dns] batch %4d: %8.2f ns per call%n", endUptimeNs[b], b + 1, nsPerCall[b]);
            }
        }
        double[] last = Arrays.copyOfRange(nsPerCall, batches - 100, batches);
        Arrays.sort(last);
        double steady = last[50];
        int reached = 0;
        while (nsPerCall[reached] > steady * 1.1) {
            reached++;
        }
        int slowLater = 0;
        for (int b = reached; b < batches; b++) {
            if (nsPerCall[b] > steady * 2) {
                slowLater++;
            }
        }
        System.out.printf("first batch %7.2f ns per call, last 100 batches %5.2f ns per call (median), "
                + "first reached at batch %4d, later batches over 2x slower: %d (sink %d)%n",
                nsPerCall[0], steady, reached + 1, slowLater, sink);
    }
}
