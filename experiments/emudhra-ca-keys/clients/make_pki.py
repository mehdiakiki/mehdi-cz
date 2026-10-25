import datetime
import sys

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

out = sys.argv[1]
curve = ec.SECP384R1()
now = datetime.datetime.now(datetime.timezone.utc)
start = now - datetime.timedelta(days=1)
end = now + datetime.timedelta(days=365)


def name(cn):
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)])


def ca_usage():
    return x509.KeyUsage(
        digital_signature=False,
        content_commitment=False,
        key_encipherment=False,
        data_encipherment=False,
        key_agreement=False,
        key_cert_sign=True,
        crl_sign=True,
        encipher_only=False,
        decipher_only=False,
    )


def write_cert(cert, path):
    with open(f"{out}/{path}", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))


def write_key(key, path):
    with open(f"{out}/{path}", "wb") as f:
        f.write(
            key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )


def ca_cert(subject, issuer_name, public_key, signing_key, path_length, issuer_public_key):
    return (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer_name)
        .public_key(public_key)
        .serial_number(x509.random_serial_number())
        .not_valid_before(start)
        .not_valid_after(end)
        .add_extension(x509.BasicConstraints(ca=True, path_length=path_length), critical=True)
        .add_extension(ca_usage(), critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(public_key), critical=False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(issuer_public_key), critical=False
        )
        .sign(signing_key, hashes.SHA384())
    )


def leaf_cert(cn, issuer_cert, signing_key):
    key = ec.generate_private_key(curve)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name(cn))
        .issuer_name(issuer_cert.subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(start)
        .not_valid_after(end)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(cn)]), critical=False)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(issuer_cert.public_key()),
            critical=False,
        )
        .sign(signing_key, hashes.SHA384())
    )
    return key, cert


def crl(issuer_cert, signing_key, revoked_serial=None):
    builder = (
        x509.CertificateRevocationListBuilder()
        .issuer_name(issuer_cert.subject)
        .last_update(start)
        .next_update(end)
    )
    if revoked_serial is not None:
        revoked = (
            x509.RevokedCertificateBuilder()
            .serial_number(revoked_serial)
            .revocation_date(now)
            .build()
        )
        builder = builder.add_revoked_certificate(revoked)
    return builder.sign(signing_key, hashes.SHA384())


root_key = ec.generate_private_key(curve)
root_cert = ca_cert(
    name("Test Local Root"),
    name("Test Local Root"),
    root_key.public_key(),
    root_key,
    1,
    root_key.public_key(),
)

intermediate_key = ec.derive_private_key(7, curve)
intermediate_cert = ca_cert(
    name("Test Weak Intermediate"),
    root_cert.subject,
    intermediate_key.public_key(),
    root_key,
    0,
    root_key.public_key(),
)

shop_key, shop_cert = leaf_cert("shop.example.test", intermediate_cert, intermediate_key)
bank_key, bank_cert = leaf_cert("bank.example.test", intermediate_cert, intermediate_key)

root_crl = crl(root_cert, root_key, revoked_serial=intermediate_cert.serial_number)
intermediate_crl = crl(intermediate_cert, intermediate_key, revoked_serial=None)

write_cert(root_cert, "test-root.pem")
write_cert(intermediate_cert, "test-int.pem")
write_key(shop_key, "shop-key.pem")
write_cert(shop_cert, "shop.pem")
write_key(bank_key, "bank-key.pem")
write_cert(bank_cert, "bank.pem")

for leaf_pem, chain_pem in (("shop.pem", "chain-shop.pem"), ("bank.pem", "chain-bank.pem")):
    with open(f"{out}/{chain_pem}", "wb") as f:
        f.write(open(f"{out}/{leaf_pem}", "rb").read())
        f.write(open(f"{out}/test-int.pem", "rb").read())

with open(f"{out}/root.crl", "wb") as f:
    f.write(root_crl.public_bytes(serialization.Encoding.PEM))
with open(f"{out}/int.crl", "wb") as f:
    f.write(intermediate_crl.public_bytes(serialization.Encoding.PEM))
with open(f"{out}/all.crl", "wb") as f:
    f.write(root_crl.public_bytes(serialization.Encoding.PEM))
    f.write(intermediate_crl.public_bytes(serialization.Encoding.PEM))
with open(f"{out}/python-store.pem", "wb") as f:
    f.write(root_cert.public_bytes(serialization.Encoding.PEM))
    f.write(root_crl.public_bytes(serialization.Encoding.PEM))
    f.write(intermediate_crl.public_bytes(serialization.Encoding.PEM))

point = intermediate_key.public_key().public_bytes(
    serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
)
with open(f"{out}/test-int-point.txt", "w") as f:
    f.write(f"Test-Weak-Intermediate {point.hex()}\n")

print("wrote synthetic pki to", out)
