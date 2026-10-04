use std::net::SocketAddrV6;

fn main() {
    let _: SocketAddrV6 = "::1:8080"
        .parse()
        .expect("an IPv6 socket address requires brackets around the address before its port");
}
