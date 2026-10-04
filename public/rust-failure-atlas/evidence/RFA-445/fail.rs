struct Record { id: u64, payload: String }

fn main() {
    let record = Record { id: 7, payload: String::from("ok") };
    let Record { id } = record;
    println!("{id}");
}
