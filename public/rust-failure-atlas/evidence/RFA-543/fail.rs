fn main() {
    let mut count = 4_u32;
    let counter = &mut count;

    let next = count + 1;
    *counter = next;
}
