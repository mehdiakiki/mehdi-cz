fn main() {
    let values = [10, 20];
    let [first, second, third, ..] = values;
    println!("{first} {second} {third}");
}
