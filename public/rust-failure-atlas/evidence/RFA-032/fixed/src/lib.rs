pub const DEFAULT_TEMPLATE: &str = include_str!("../assets/default.txt");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn packaged_build_keeps_its_compile_time_input() {
        assert_eq!(DEFAULT_TEMPLATE.trim(), "hello from the packaged template");
    }
}
