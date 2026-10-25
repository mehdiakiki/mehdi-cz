"""Run a command many times, kill it with SIGKILL after a random delay, and count what a checker prints."""

import argparse
import collections
import random
import shlex
import signal
import subprocess
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, required=True)
    parser.add_argument("--max-ms", type=float, required=True)
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--setup", required=True)
    parser.add_argument("--run", required=True)
    parser.add_argument("--check", required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    counts = collections.Counter()
    for _ in range(args.runs):
        subprocess.run(args.setup, shell=True, check=True, stdout=subprocess.DEVNULL)
        proc = subprocess.Popen(shlex.split(args.run), stdout=subprocess.DEVNULL)
        time.sleep(rng.uniform(0, args.max_ms) / 1000)
        proc.send_signal(signal.SIGKILL)
        killed = proc.wait() == -signal.SIGKILL
        result = subprocess.run(args.check, shell=True, check=True, capture_output=True, text=True)
        counts[(result.stdout.strip(), killed)] += 1

    print(f"{args.runs} runs, SIGKILL after a random delay between 0 and {args.max_ms:g} ms")
    print(f"{'killed':>8}{'finished':>10}  outcome")
    for outcome in sorted({o for o, _ in counts}, key=lambda o: -counts[(o, True)] - counts[(o, False)]):
        print(f"{counts[(outcome, True)]:>8}{counts[(outcome, False)]:>10}  {outcome}")


if __name__ == "__main__":
    main()
