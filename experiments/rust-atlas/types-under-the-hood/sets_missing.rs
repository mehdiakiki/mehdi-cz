// Article 3: the exhaustiveness error is counting. This file must not compile.
#[allow(dead_code)]
enum Human { Man, Woman }

fn label(h: Option<Human>) -> &'static str {
    match h {
        Some(Human::Man) => "sir",
        None => "nobody",
    }
}

fn pair(p: (bool, Human)) -> u8 {
    match p {
        (true, Human::Man) => 0,
        (false, Human::Man) => 1,
        (true, Human::Woman) => 2,
    }
}

fn main() { let _ = (label(None), pair((true, Human::Man))); }
