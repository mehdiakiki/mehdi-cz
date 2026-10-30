use sql_rust_enterprise_examples::AnyResult;

// article:start probe
fn probe() -> oracle::Result<bool> {
    println!(
        "os={} arch={} pointer_bits={}",
        std::env::consts::OS,
        std::env::consts::ARCH,
        usize::BITS
    );
    oracle::InitParams::new().init()
}
// article:end probe

fn main() -> AnyResult<()> {
    let expect_missing = std::env::args().any(|arg| arg == "--expect-missing");
    match (probe(), expect_missing) {
        (Err(error), true) => {
            let message = error.to_string();
            assert!(
                message.contains("DPI-1047"),
                "unexpected initialization failure: {message}"
            );
            println!("Expected missing-client failure: {message}");
            println!("No database connection was attempted.");
            Ok(())
        }
        (Ok(_), true) => Err("negative fixture unexpectedly found a client".into()),
        (Ok(first), false) => {
            assert!(first, "fresh probe process must initialize the client once");
            println!("Oracle Client initialized. Authentication and server compatibility remain untested.");
            Ok(())
        }
        (Err(error), false) => Err(error.into()),
    }
}
