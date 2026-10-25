use std::process::Command;
use std::time::Instant;

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let runs: usize = args[0].parse().expect("number of runs");
    let mut ns: Vec<u128> = (0..runs)
        .map(|_| {
            let start = Instant::now();
            let status = Command::new(&args[1]).args(&args[2..]).status().expect("start the program");
            assert!(status.success());
            start.elapsed().as_nanos()
        })
        .collect();
    let first = ns[0];
    ns.sort();
    println!(
        "{runs} fresh processes of {}: first {} us, min {} us, median {} us, max {} us",
        args[1..].join(" "),
        first / 1000,
        ns[0] / 1000,
        ns[runs / 2] / 1000,
        ns[runs - 1] / 1000
    );
}
