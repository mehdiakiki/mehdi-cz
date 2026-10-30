mod gateway;
use gateway::{Call, Gateway, Workflow};
use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr, TcpListener, TcpStream},
    time::Duration,
};

fn main() {
    if std::env::args().nth(1).as_deref() != Some("--capture") {
        eprintln!("capture mode is required");
        std::process::exit(2);
    }
    for name in ["SMTP_PASSWORD", "MAIL_API_KEY", "PROVIDER_TOKEN"] {
        assert!(std::env::var_os(name).is_none());
    }
    let mut gateway = Gateway::capture_only();
    let mut context = gateway
        .context(
            "fixture-operator",
            "account-a",
            Workflow::Notifications,
            "mail-47",
            "request-47",
        )
        .unwrap();
    let call = Call::SendMail {
        recipient: "test@example.test".into(),
        subject: "fixture".into(),
        body: "synthetic".into(),
    };
    assert!(gateway.execute(&mut context, call.clone()).is_err());
    assert!(gateway.mail.messages.is_empty());
    gateway.approve(&context, call.clone()).unwrap();
    gateway.execute(&mut context, call).unwrap();
    assert_eq!(gateway.mail.messages.len(), 1);
    assert!(gateway
        .context(
            "fixture-alice",
            "account-a",
            Workflow::Notifications,
            "forbidden-47",
            "request-47"
        )
        .is_err());
    let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
    let local = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
    let (accepted, _) = listener.accept().unwrap();
    drop((local, accepted, listener));
    let error = TcpStream::connect_timeout(
        &SocketAddr::new(IpAddr::V4(Ipv4Addr::new(198, 51, 100, 1)), 443),
        Duration::from_millis(100),
    )
    .unwrap_err();
    assert_eq!(error.raw_os_error(), Some(101));
    let routes = std::fs::read_to_string("/proc/net/route").unwrap();
    assert_eq!(
        routes
            .lines()
            .skip(1)
            .filter(|line| !line.trim().is_empty())
            .count(),
        0
    );
    println!("CAPTURE_PROCESS: startup=capture-only; configured production secret variables absent; missing approval denied; approved message captured=1; unauthorized actor denied; loopback control works; external connect=ENETUNREACH with no routes");
}
