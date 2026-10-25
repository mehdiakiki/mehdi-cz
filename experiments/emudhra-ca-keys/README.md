# emudhra-ca-keys

The experiment behind the article "My Laptop Still Trusted the Cracked eMudhra Keys".
Driven by `run.sh`.

## What it shows

1. `recover`: a P-384 public key is `d` times the fixed generator point `G`. For a real key
   `d` is a random 384-bit number and nobody can go back from the point to `d`. The eight
   eMudhra intermediate keys had `d` below 256, so trying `d = 1, 2, ..., 255` finds them. The
   program reads the public key from each real certificate in `certs/real` and searches for `d`.
   Each key appears twice, in an eMudhra certificate and in a Sectigo cross-signed certificate
   with the same public key, so both recover the same `d`. As a control it also reads the real
   `emSign ECC Root CA - G3` public key from the system trust store; that `d` is a proper random
   number, so the search to 255 finds nothing.
2. `chain`: the compromised intermediates are signed by `emSign Root TLS CA - G3`, which is not
   in the system store. A cross-certificate signs `emSign Root TLS CA - G3` with
   `emSign ECC Root CA - G3`, which is the trust anchor on this laptop. `run.sh` verifies a real
   intermediate against the system store without and with that cross-certificate, and then with
   eMudhra's own CRL and revocation checking.
3. `trust`: which programs on this laptop still trust `emSign ECC Root CA - G3`, read only. It
   records the system bundle, Python `ssl`, a `cmp` showing `certifi` is a link to the system
   bundle, the Java aliases, a small Go program that verifies the chain against `SystemCertPool`,
   `rustls-native-certs`, and the Node default vs `--use-system-ca` root counts and `webpki-roots`.
4. `tls`: a private test chain on 127.0.0.1. A test root signs a test intermediate whose private
   key is the integer 7 on purpose. curl, Python and Node are told to trust only the test root,
   then connect to a local server, with and without the test root's CRL.

## Where the certificates come from

`certs/real` holds the 16 compromised intermediate certificates (8 keys, each in an eMudhra and a
Sectigo certificate). They are public. They were downloaded from crt.sh by SHA-256, and every
fingerprint is checked against `certs/sha256-list.txt`, which is the list from the notice that
Mozilla sent to trust store operators (attachment "disclosure" on Mozilla bug 2083449).
`certs/emsign-root-tls-g3-cross.pem` is the cross-certificate (crt.sh id 14658191778); its public
key hash matches the notice. `certs/roottlscag3.crl.pem` is eMudhra's CRL from the certificates'
distribution point (`crl.emsign.com`).

## Files

- `recover/` Rust program `ecsmall`: `gen <d>` prints the point `d*G`, `find` searches a point.
- `trust-inspect/` Rust program that checks the `webpki-roots` and `rustls-native-certs` crates.
- `certs/real/` the 16 real certificates; `certs/sha256-list.txt` their fingerprints.
- `certs/emsign-root-tls-g3-cross.pem`, `certs/roottlscag3.crl.pem` the cross-certificate and the CRL.
- `clients/make_pki.py` builds the private test PKI into `out/` using the Python cryptography library.
- `clients/tls_check.py`, `clients/tls_check.js` one-line TLS clients.
- `clients/trust_check.go` (with `go.mod`) verifies a real intermediate against Go's `SystemCertPool`.
- `results/` the saved output the article quotes.
- `out/` downloads, cargo target, built test certificates and keys. Git ignored.

## Wrong on purpose

The test intermediate in `clients/make_pki.py` uses the private value 7. It exists only for the
local 127.0.0.1 demo. The real recovered eMudhra values are never written as keys and never used
to sign anything; the experiment only reads public keys and verifies chains.

## Run

    sh run.sh              # everything
    sh run.sh chain        # one part: build | versions | recover | chain | trust | tls

Set `HEAVY_LOCK=/path/to/lockfile` to run the compiles and the timing under a shared lock.
`CRL_FETCH=1` refreshes eMudhra's CRL from its distribution point (the default uses the committed
snapshot). `PORT` (default 24731) and `BUNDLE` (the system CA bundle) can be overridden.

## Tools on this laptop

rustc 1.100.0-nightly, p384 0.13, webpki-roots 1.0.11, rustls-native-certs 0.8.5,
OpenSSL 3.6.1, curl 8.18.0, Node v26.12.1, Python 3.14.3 with cryptography 46.0.5,
Go 1.25.7, OpenJDK 17. The build downloads the Rust crates from crates.io and compiles the Go
program (its cache stays under `out/`).
