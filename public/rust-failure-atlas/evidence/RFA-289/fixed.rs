use std::net::{Ipv6Addr, SocketAddrV6};

fn main() {
    let address: SocketAddrV6 = "[::1]:8080".parse().expect("valid bracketed IPv6 socket address");
    assert_eq!(address.ip(), &Ipv6Addr::LOCALHOST);
    assert_eq!(address.port(), 8080);
    assert_eq!(address.to_string(), "[::1]:8080");
}
