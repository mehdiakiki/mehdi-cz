use std::env;

#[derive(Debug)]
#[must_use]
enum Step {
    Decoded,
    NeedMoreInput,
    Malformed,
}

struct Decoder<'a> {
    input: &'a [u8],
    pos: usize,
}

impl Decoder<'_> {
    fn classify(&self) -> Step {
        match self.input.get(self.pos) {
            None => Step::NeedMoreInput,
            Some(&types) if types < 2 => Step::Malformed,
            Some(_) => Step::Decoded,
        }
    }
}

fn handle_each_state(input: &[u8]) {
    let mut d = Decoder { input, pos: 0 };
    let mut blocks = 0u32;
    loop {
        match d.classify() {
            Step::Decoded => {
                blocks += 1;
                d.pos += 1;
            }
            Step::NeedMoreInput => {
                println!("need more input after {blocks} blocks, stop and wait");
                return;
            }
            Step::Malformed => {
                println!("malformed block switch after {blocks} blocks, stop now");
                return;
            }
        }
    }
}

fn port_the_c_bug(input: &[u8]) {
    let mut d = Decoder { input, pos: 0 };
    let mut out = [0u8; 8];
    let mut written = 0usize;
    while d.pos < input.len() {
        d.classify();
        out[written] = input[d.pos];
        written += 1;
        d.pos += 1;
    }
    println!("wrote {written} bytes, first byte {}", out[0]);
}

fn main() {
    let mode = env::args().nth(1).unwrap_or_default();
    let input = [1u8; 20];
    match mode.as_str() {
        "match" => handle_each_state(&input),
        "ignore" => port_the_c_bug(&input),
        other => {
            eprintln!("usage: toy-rust match|ignore (got {other:?})");
            std::process::exit(2);
        }
    }
}
