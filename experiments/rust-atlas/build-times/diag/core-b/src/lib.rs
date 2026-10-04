//! Depends on core-a and on a build script.

pub fn describe() -> String {
    let schema = if cfg!(schema_present) { "present" } else { "missing" };
    format!("core-b schema={schema} <- {}", core_a::label())
}
