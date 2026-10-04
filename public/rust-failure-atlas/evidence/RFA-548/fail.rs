fn schedule(total: &mut u32) {
    let mut reserve = || *total += 1;
    let mut commit = || *total += 10;

    reserve();
    commit();
}

fn main() {
    let mut total = 0;
    schedule(&mut total);
}
