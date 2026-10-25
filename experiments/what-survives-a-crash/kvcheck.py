"""After a run of the store that was stopped: does recovery give a correct state for the acknowledgements?"""

import os
import sys

import simkv


def classify(kv, directory, commands, acks_file, bug_args):
    lines = open(acks_file).readlines() if os.path.exists(acks_file) else []
    acked = sum(1 for line in lines if line.startswith("ok "))
    states = simkv.expected_states(commands)
    recovered, info = simkv.dump(kv, directory, bug_args)
    if recovered is None:
        return "recovery failed"
    if recovered in states[acked:]:
        return "correct"
    if recovered in states:
        return "acknowledged operations lost"
    return "a state that no prefix of the operations gives"


def main(kv, directory, commands_file, acks_file, bug):
    commands = [line.strip() for line in open(commands_file) if line.strip()]
    bug_args = ["--bug", bug] if bug != "none" else []
    print(classify(kv, directory, commands, acks_file, bug_args))


if __name__ == "__main__":
    main(*sys.argv[1:6])
