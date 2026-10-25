use std::io::Write;

fn main() {
    let mut v: Vec<u8> = Vec::new();
    let mut capacity = 0;
    let mut out = std::io::stdout().lock();
    for i in 0..(64usize << 20) {
        v.push(i as u8);
        if v.capacity() != capacity {
            capacity = v.capacity();
            if capacity >= 128 << 10 {
                writeln!(out, "capacity {capacity:>9} at {:p}", v.as_ptr()).unwrap();
                out.flush().unwrap();
            }
        }
    }
    writeln!(out, "len {} sum {}", v.len(), v.iter().map(|&b| b as u64).sum::<u64>()).unwrap();
}
