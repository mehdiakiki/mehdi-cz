import socket
import ssl
import sys

host = sys.argv[1]
port = int(sys.argv[2])
cafile = sys.argv[3]
servername = sys.argv[4]
check_crl = len(sys.argv) > 5 and sys.argv[5] == "crl"

ctx = ssl.create_default_context(cafile=cafile)
if check_crl:
    ctx.verify_flags |= ssl.VERIFY_CRL_CHECK_CHAIN

try:
    with socket.create_connection((host, port), timeout=10) as raw:
        with ctx.wrap_socket(raw, server_hostname=servername) as tls_sock:
            tls_sock.getpeercert()
    print("python accept")
except ssl.SSLCertVerificationError as exc:
    print("python reject", f"verify_code={exc.verify_code}", exc.verify_message)
except ssl.SSLError as exc:
    print("python reject", getattr(exc, "reason", None) or str(exc).split(":")[0])
except Exception as exc:
    print("python error", type(exc).__name__)
