// The same addition, on the edge of the type. Run once as a debug build and
// once as a release build to see the overflow guard appear and disappear.
#[inline(never)]
fn bump(age: u8) -> u8 { age + 1 }

#[inline(never)]
fn bump_wide(age: u32) -> u32 { age + 1 }

fn main() {
    let build = if cfg!(debug_assertions) { "debug" } else { "release" };
    println!("{build} build: bump_wide(255) = {}", bump_wide(std::hint::black_box(255)));
    println!("{build} build: bump(255)      = {}", bump(std::hint::black_box(255)));
}
