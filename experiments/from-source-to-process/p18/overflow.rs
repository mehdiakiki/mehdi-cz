use std::hint::black_box;
use std::io::Write;

fn recurse(level: u64) -> u64 {
    let buffer = black_box([level as u8; 1000]);
    if level % 1024 == 0 {
        let _ = writeln!(std::io::stderr(), "reached depth {level}");
    }
    recurse(level + 1) + buffer[0] as u64
}

fn print_own_stack_mapping() {
    let local = 0u8;
    let address = &local as *const u8 as usize;
    let maps = std::fs::read_to_string("/proc/self/maps").unwrap();
    let lines: Vec<&str> = maps.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        let range = line.split_whitespace().next().unwrap();
        let (start, end) = range.split_once('-').unwrap();
        let (start, end) = (usize::from_str_radix(start, 16).unwrap(), usize::from_str_radix(end, 16).unwrap());
        if start <= address && address < end {
            println!("the mapping below it:     {}", lines[i - 1]);
            println!("the mapping of the stack: {line}");
            println!("stack mapping size: {} bytes", end - start);
        }
    }
}

fn main() {
    let mode = std::env::args().nth(1).unwrap_or_default();
    if mode == "thread" {
        let worker = std::thread::spawn(|| {
            print_own_stack_mapping();
            recurse(1)
        });
        println!("{}", worker.join().unwrap());
    } else {
        println!("{}", recurse(1));
    }
}
