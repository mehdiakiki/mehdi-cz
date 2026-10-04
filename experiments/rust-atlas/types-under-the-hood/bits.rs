// Article 8: the processor has no types. Same operation, four types.
#[no_mangle] pub fn add_i32(a: i32, b: i32) -> i32 { a + b }
#[no_mangle] pub fn add_u32(a: u32, b: u32) -> u32 { a + b }
#[no_mangle] pub fn add_f32(a: f32, b: f32) -> f32 { a + b }

#[no_mangle] pub fn less_i32(a: i32, b: i32) -> bool { a < b }
#[no_mangle] pub fn less_u32(a: u32, b: u32) -> bool { a < b }

#[no_mangle] pub fn div_i32(a: i32, b: i32) -> i32 { a / b }
#[no_mangle] pub fn div_u32(a: u32, b: u32) -> u32 { a / b }

#[no_mangle] pub fn shr_i32(a: i32) -> i32 { a >> 1 }
#[no_mangle] pub fn shr_u32(a: u32) -> u32 { a >> 1 }
