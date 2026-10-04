fn replace<'stored, 'incoming>(slot: &mut &'stored str, incoming: &'incoming str) {
    *slot = incoming;
}

fn main() {
    let long_lived = String::from("stable");
    let mut slot = long_lived.as_str();
    {
        let short_lived = String::from("temporary");
        replace(&mut slot, short_lived.as_str());
    }
    println!("{slot}");
}
