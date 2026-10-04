pub fn stable_value() -> u32 {
    42
}

#[cfg(test)]
mod tests {
    #[test]
    fn library_is_healthy() {
        assert_eq!(super::stable_value(), 42);
    }
}
