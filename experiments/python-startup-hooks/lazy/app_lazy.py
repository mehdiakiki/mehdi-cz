lazy import json
import argparse
lazy import importlib.metadata as md
lazy import email.parser
lazy import csv
lazy import xml.etree.ElementTree as ET
lazy import http.client
lazy import decimal
lazy import statistics

VERSION = "1.0.0"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", action="store_true")
    args = parser.parse_args()
    if args.version:
        print(VERSION)
        return
    print(json.dumps({"modules": [md.__name__, email.parser.__name__,
                                   csv.__name__, ET.__name__,
                                   http.client.__name__, decimal.__name__,
                                   statistics.__name__]}))


if __name__ == "__main__":
    main()
