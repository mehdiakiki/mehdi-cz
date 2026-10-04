fn normalize_line_endings(input: &str) -> String {
    input.replace("\r\n", "\n").replace('\r', "\n")
}

fn main() {
    let normalized = normalize_line_endings("alpha\rbeta\r\ngamma");
    let lines: Vec<_> = normalized.lines().collect();

    assert_eq!(lines, vec!["alpha", "beta", "gamma"]);
}
