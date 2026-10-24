# Rust 1.100 version checks

Evidence for the article [What Breaks When Rust Reaches 1.100](https://www.mehdi.cz/blog/what-breaks-when-rust-reaches-1-100).

Every check asks one question: is this compiler at least Rust 1.80? Each check gets two versions, the real Rust 1.99.1 and 1.100.0. The text checks get the version text directly. The crate probe needs a compiler, so it also runs against `fake-rustc`, a stand-in that prints the version 1.100.0 in the normal format and passes everything else to the real 1.99.1 compiler. `fake-rustc-beta` does the same with the version text of the beta, and the probe also runs on the real beta compiler. Its last line asks for at least 1.100, where the beta and the release give different answers.

Run everything with:

```bash
./run.sh
```

It needs rustup with the `1.99.1` and `beta` toolchains, Python 3 with PyYAML, Node.js, and `npm install` at the repository root for js-yaml. The output goes to `results/`. The committed results were recorded on 2026-10-24 with `rustc 1.99.1 (58cf8f9c3 2026-10-13)` and `rustc 1.100.0-beta.7 (fd8e211ae 2026-10-17)`. The beta channel moves, so a later run can print a newer beta.

| File | What it checks |
| --- | --- |
| `text-checks.sh` | bash, awk, grep, sort and cut on both version strings, and cut on the beta string |
| `text-checks.py` | Python string, float and integer-tuple comparisons |
| `text-checks.mjs` | JavaScript string, `parseFloat` and numeric comparisons |
| `config-checks.sh` | how YAML and TOML read an unquoted `1.100` |
| `probe/` | a build script that asks autocfg, version_check, rustc_version and semver |
| `rust-1-1-check.sh` | what rustup and Cargo do when YAML turns `1.100` into `1.1` |

`run.sh` does not run `rust-1-1-check.sh`, because it downloads Rust 1.1.0 from 2015 into a throwaway rustup home. Run it by hand when you want to see it. It reuses a rustup home passed as the first argument, and its recorded output is in `results/rust-1-1.txt`.
