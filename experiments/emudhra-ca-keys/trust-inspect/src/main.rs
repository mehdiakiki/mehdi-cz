fn contains(haystack: &[u8], needle: &[u8]) -> bool {
    needle.len() <= haystack.len() && haystack.windows(needle.len()).any(|w| w == needle)
}

fn main() {
    let target: &[u8] = b"emSign ECC Root CA - G3";
    let emsign: &[u8] = b"emSign";

    let mut wp_total = 0usize;
    let mut wp_emsign = 0usize;
    let mut wp_has_target = false;
    for anchor in webpki_roots::TLS_SERVER_ROOTS {
        wp_total += 1;
        let subject: &[u8] = anchor.subject.as_ref();
        if contains(subject, emsign) {
            wp_emsign += 1;
        }
        if contains(subject, target) {
            wp_has_target = true;
        }
    }
    println!("webpki-roots total={wp_total} emsign_subjects={wp_emsign} has_target={wp_has_target}");

    let loaded = rustls_native_certs::load_native_certs();
    let mut sys_total = 0usize;
    let mut sys_has_target = false;
    for cert in &loaded.certs {
        sys_total += 1;
        if contains(cert.as_ref(), target) {
            sys_has_target = true;
        }
    }
    println!("rustls-native-certs errors={}", loaded.errors.len());
    println!("rustls-native-certs total={sys_total} has_target={sys_has_target}");
}
