use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

fn main() {
    let mapped_loopback = Ipv4Addr::LOCALHOST.to_ipv6_mapped();
    assert!(!mapped_loopback.is_loopback());
    assert_eq!(mapped_loopback.to_ipv4_mapped(), Some(Ipv4Addr::LOCALHOST));
    assert!(mapped_loopback.to_canonical().is_loopback());
    assert!(IpAddr::V6(Ipv6Addr::LOCALHOST).is_loopback());
}
