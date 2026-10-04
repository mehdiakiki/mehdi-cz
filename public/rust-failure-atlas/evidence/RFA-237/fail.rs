use std::net::Ipv4Addr;

fn main() {
    let mapped_loopback = Ipv4Addr::LOCALHOST.to_ipv6_mapped();
    assert!(
        mapped_loopback.is_loopback(),
        "Ipv6Addr::is_loopback does not classify an IPv4-mapped loopback as IPv6 loopback"
    );
}
