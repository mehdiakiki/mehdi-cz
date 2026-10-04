fn hidden_value() -> u32 {
    42
}

#[macro_export]
macro_rules! public_value {
    () => {
        $crate::hidden_value()
    };
}
