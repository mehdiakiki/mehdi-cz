fn main() {
    let lines: Vec<_> = "alpha\rbeta\r\ngamma".lines().collect();

    assert_eq!(
        lines,
        vec!["alpha", "beta", "gamma"],
        "str::lines recognizes LF and CRLF but preserves a lone carriage return"
    );
}
