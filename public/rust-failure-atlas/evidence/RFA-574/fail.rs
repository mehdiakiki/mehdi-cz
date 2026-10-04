fn main() {
    let selected;

    {
        let response = String::from("ready");
        selected = response.as_str();
    }

    println!("{selected}");
}
