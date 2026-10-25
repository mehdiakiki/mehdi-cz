use std::env;
use std::fs::OpenOptions;
use std::io::Write;

fn main() {
    let path = env::args().nth(1).expect("usage: retrysync FILE");
    let mut file = OpenOptions::new().create(true).append(true).open(&path).expect("open");
    file.write_all(b"an important record\n").expect("write");
    match file.sync_data() {
        Ok(()) => println!("first fdatasync: ok"),
        Err(error) => {
            println!("first fdatasync: {error}");
            match file.sync_data() {
                Ok(()) => println!("second fdatasync: ok, so the program reports the record as saved"),
                Err(error) => println!("second fdatasync: {error}"),
            }
        }
    }
}
