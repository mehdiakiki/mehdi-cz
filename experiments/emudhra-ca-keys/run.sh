#!/bin/sh
set -eu

here=$(CDPATH= cd "$(dirname "$0")" && pwd)
cd "$here"
OUT="$here/out"
RES="$here/results"
CERTS="$here/certs"
mkdir -p "$OUT" "$RES"

export CARGO_HOME="$OUT/cargo-home"
export CARGO_TARGET_DIR="$OUT/target"

PORT="${PORT:-24731}"
BUNDLE="${BUNDLE:-/etc/ca-certificates/extracted/tls-ca-bundle.pem}"
[ -f "$BUNDLE" ] || BUNDLE=/etc/ssl/certs/ca-certificates.crt
ECS="$OUT/target/release/ecsmall"
TRI="$OUT/target/release/trust-inspect"
TARGET="emSign ECC Root CA - G3"

# Heavy steps go through the shared machine lock when HEAVY_LOCK points at a lock file.
heavy() {
  if [ -n "${HEAVY_LOCK:-}" ]; then flock "$HEAVY_LOCK" "$@"; else "$@"; fi
}

build() {
  heavy cargo build --release --manifest-path "$here/recover/Cargo.toml"
  heavy cargo build --release --manifest-path "$here/trust-inspect/Cargo.toml"
  heavy env GOCACHE="$OUT/go-cache" GOPATH="$OUT/go-path" go build -C "$here/clients" -o "$OUT/trust-check" .
}

fingerprint() { openssl x509 -in "$1" -noout -fingerprint -sha256 | sed 's/.*=//; s/://g'; }

points() {
  : > "$OUT/realpoints.txt"
  for f in "$CERTS"/real/*.pem; do
    sha=$(fingerprint "$f")
    grep -qi "^$sha$" "$CERTS/sha256-list.txt" || { echo "unlisted certificate: $f" >&2; exit 1; }
    cn=$(openssl x509 -in "$f" -noout -subject -nameopt multiline | awk -F'= ' '/commonName/{print $2}')
    case "$(openssl x509 -in "$f" -noout -issuer)" in *AAA*) tag=Sectigo ;; *) tag=emSign ;; esac
    label=$(printf '%s' "$cn" | tr ' ' '-' | tr -s '-')/$tag
    pt=$(openssl x509 -in "$f" -noout -pubkey | openssl pkey -pubin -outform DER 2>/dev/null \
      | tail -c 97 | od -An -v -tx1 | tr -d ' \n')
    printf '%s %s\n' "$label" "$pt" >> "$OUT/realpoints.txt"
  done
  awk '/^# emSign ECC Root CA - G3$/{g=1;next} g&&/BEGIN CERTIFICATE/{i=1} i{print} g&&/END CERTIFICATE/{exit}' \
    "$BUNDLE" > "$OUT/root.pem" || true
  if [ -s "$OUT/root.pem" ]; then
    ctrl=$(openssl x509 -in "$OUT/root.pem" -noout -pubkey | openssl pkey -pubin -outform DER 2>/dev/null \
      | tail -c 97 | od -An -v -tx1 | tr -d ' \n')
    printf '%s %s\n' "emSign-ECC-Root-CA-G3-real/anchor" "$ctrl" >> "$OUT/realpoints.txt"
  fi
}

versions() {
  {
    echo "rustc: $(rustc --version)"
    echo "openssl: $(openssl version)"
    echo "curl: $(curl --version | head -1)"
    echo "node: $(node --version)"
    echo "python3: $(python3 --version)"
    echo "cryptography: $(python3 -c 'import cryptography;print(cryptography.__version__)')"
    echo "go: $(go version 2>/dev/null || echo 'not found')"
    echo "java: $(java -version 2>&1 | head -1)"
    grep -E '^(webpki-roots|rustls-native-certs)' "$here/trust-inspect/Cargo.toml"
    echo "p384: $(grep '^p384' "$here/recover/Cargo.toml")"
    echo "certificates: certs/real (16, from crt.sh by SHA-256), verified against certs/sha256-list.txt"
  } > "$RES/versions.txt"
}

recover() {
  points
  "$ECS" find 255 < "$OUT/realpoints.txt" >/dev/null
  {
    echo "public keys read from the real certificates in certs/real (each fingerprint checked against certs/sha256-list.txt)"
    echo "load at the start of the timing:"
    uptime
    echo
    echo "three runs; time_us moves with the load, the recovered value does not:"
    for n in 1 2 3; do
      echo "run $n:"
      heavy "$ECS" find 255 < "$OUT/realpoints.txt" | sort
      echo
    done
  } > "$RES/recover.txt"
}

chain() {
  crl="$OUT/roottls.crl.pem"
  if [ "${CRL_FETCH:-0}" = "1" ] \
    && curl -sS --max-time 25 "https://crl.emsign.com/?roottlscag3.crl" -o "$OUT/root.crl.der" 2>/dev/null \
    && openssl crl -inform DER -in "$OUT/root.crl.der" -outform PEM -out "$crl" 2>/dev/null; then
    crl_src="live distribution point"
  else
    cp "$CERTS/roottlscag3.crl.pem" "$crl"
    crl_src="committed snapshot certs/roottlscag3.crl.pem"
  fi
  int="certs/real/98B896625C0C230ADEEC3EB2CF6AAD5001ECF9156A68644E82374CE5833BC25B.pem"
  cross="certs/emsign-root-tls-g3-cross.pem"
  {
    echo "a real compromised intermediate:"
    echo "  subject: $(openssl x509 -in "$int" -noout -subject | sed 's/subject=//')"
    echo "  issuer:  $(openssl x509 -in "$int" -noout -issuer | sed 's/issuer=//')"
    echo
    echo "still a trust anchor on this laptop:"
    echo "  blocklist emSign entries: $(trust list --filter=blocklist 2>/dev/null | grep -ci emsign)"
    echo "  system bundle has $TARGET: $(grep -c "$TARGET" "$BUNDLE")"
    echo
    echo "verify against the system store WITHOUT the cross-certificate:"
    openssl verify -CAfile "$BUNDLE" "$int" 2>&1 | sed 's/^/  /' || true
    echo
    echo "verify WITH the cross-certificate (emSign Root TLS CA - G3 signed by the anchor) as the bridge:"
    openssl verify -CAfile "$BUNDLE" -untrusted "$cross" "$int" 2>&1 | sed 's/^/  /' || true
    echo
    echo "revocation with eMudhra's own CRL ($crl_src):"
    openssl verify -crl_check -CAfile "$BUNDLE" -untrusted "$cross" -CRLfile "$crl" "$int" 2>&1 | sed 's/^/  /' || true
  } > "$RES/chain-real.txt"
}

trust() {
  pycafile=$(python3 -I -c 'import ssl;print(ssl.get_default_verify_paths().openssl_cafile)')
  certifi=$(python3 -I -c 'import certifi;print(certifi.where())' 2>/dev/null || echo none)
  int="certs/real/98B896625C0C230ADEEC3EB2CF6AAD5001ECF9156A68644E82374CE5833BC25B.pem"
  cross="certs/emsign-root-tls-g3-cross.pem"
  nodecount='const t=require("tls"),{X509Certificate}=require("crypto");const c=t.getCACertificates("default");const g=c.filter(p=>{try{return /emSign ECC Root CA - G3/.test(new X509Certificate(p).subject)}catch(e){return false}}).length;process.stdout.write("total="+c.length+" G3="+g+"\n");'
  "$TRI" > "$OUT/tri.txt" 2>&1 || true
  {
    echo "target root: $TARGET"
    echo
    echo "read the operating system trust store, which still has the root:"
    echo "  system bundle $BUNDLE"
    echo "    has_root=$(grep -c "$TARGET" "$BUNDLE" 2>/dev/null || echo 0)   (curl, python ssl)"
    echo "  python ssl default cafile=$pycafile has_root=$(grep -c "$TARGET" "$pycafile" 2>/dev/null || echo 0)"
    echo "  certifi where=$certifi"
    echo "    realpath=$(readlink -f "$certifi" 2>/dev/null || echo '?')"
    if cmp -s "$certifi" "$BUNDLE"; then echo "    cmp: byte-for-byte identical to the system bundle"; else echo "    cmp: differs from the system bundle"; fi
    echo "  java cacerts emSign aliases:"
    keytool -list -cacerts -storepass changeit 2>/dev/null | grep -i emsign | sed 's/^/    /' || true
    printf '  go system roots: '
    "$OUT/trust-check" "$int" "$cross" 2>&1 || true
    grep 'rustls-native-certs total' "$OUT/tri.txt" | sed 's/^/  rust /'
    echo
    echo "ship their own compiled-in copy, already updated (root removed):"
    printf '  node default roots: '
    node -e "$nodecount"
    printf '  node --use-system-ca: '
    node --use-system-ca -e "$nodecount"
    grep 'webpki-roots total' "$OUT/tri.txt" | sed 's/^/  rust /'
  } > "$RES/trust-laptop.txt"
}

tls() {
  python3 "$here/clients/make_pki.py" "$OUT" >/dev/null
  recov=$("$ECS" find 255 < "$OUT/test-int-point.txt")
  openssl s_server -accept 127.0.0.1:"$PORT" -cert "$OUT/bank.pem" -key "$OUT/bank-key.pem" \
    -cert_chain "$OUT/test-int.pem" -www -quiet > "$OUT/sserver.log" 2>&1 &
  srv=$!
  trap 'kill "$srv" 2>/dev/null || true' EXIT INT TERM
  i=0
  while [ "$i" -lt 100 ]; do
    ss -ltn 2>/dev/null | grep -q ":$PORT " && break
    i=$((i + 1))
  done
  {
    echo "recovered the test intermediate key from its public point: $recov"
    echo
    echo "server: openssl s_server on 127.0.0.1:$PORT"
    echo "leaf bank.example.test, chain = test intermediate; each client trusts ONLY the test root"
    echo
    echo "[default settings]"
    curl -sS -o /dev/null -w '  curl   accept  http=%{http_code} verify=%{ssl_verify_result}\n' \
      --cacert "$OUT/test-root.pem" --resolve bank.example.test:"$PORT":127.0.0.1 \
      "https://bank.example.test:$PORT/" 2>&1 || true
    printf '  '
    python3 "$here/clients/tls_check.py" 127.0.0.1 "$PORT" "$OUT/test-root.pem" bank.example.test
    printf '  '
    node "$here/clients/tls_check.js" 127.0.0.1 "$PORT" "$OUT/test-root.pem" bank.example.test
  } > "$RES/clients-accept.txt"
  {
    echo "the test root publishes a CRL that revokes the test intermediate"
    echo
    echo "[same clients, revocation turned on]"
    curl -sS -o /dev/null -w '  curl   http=%{http_code} verify=%{ssl_verify_result}\n' \
      --cacert "$OUT/test-root.pem" --crlfile "$OUT/all.crl" --resolve bank.example.test:"$PORT":127.0.0.1 \
      "https://bank.example.test:$PORT/" 2>&1 | sed 's/^/  /' || true
    printf '  '
    python3 "$here/clients/tls_check.py" 127.0.0.1 "$PORT" "$OUT/python-store.pem" bank.example.test crl
    printf '  '
    node "$here/clients/tls_check.js" 127.0.0.1 "$PORT" "$OUT/test-root.pem" bank.example.test "$OUT/all.crl"
  } > "$RES/revocation.txt"
  kill "$srv" 2>/dev/null || true
  wait "$srv" 2>/dev/null || true
  trap - EXIT INT TERM
}

clean() {
  for f in "$RES"/*.txt; do
    [ -f "$f" ] || continue
    sed -i 's#/home/[A-Za-z0-9_.-]*#DIR#g' "$f"
  done
}

case "${1:-all}" in
  build) build ;;
  versions) versions ;;
  recover) build; recover ;;
  chain) chain ;;
  trust) build; trust ;;
  tls) build; tls ;;
  all) build; versions; recover; chain; trust; tls ;;
  *) echo "usage: sh run.sh [build|versions|recover|chain|trust|tls|all]"; exit 2 ;;
esac
clean
