#[derive(Debug)]
struct Account {
    name: String,
    retries: u32,
}

fn main() {
    let account = Account {
        name: String::from("worker"),
        retries: 3,
    };

    let name = account.name;
    println!("account after extraction: {account:?}");
    println!("extracted name: {name}");
}
