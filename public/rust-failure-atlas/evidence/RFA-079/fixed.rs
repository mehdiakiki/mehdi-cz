use std::mem::ManuallyDrop;

union Slot {
    text: ManuallyDrop<String>,
    number: u64,
}

fn main() {
    let mut slot = Slot {
        text: ManuallyDrop::new(String::from("atlas")),
    };

    unsafe {
        assert_eq!(&*slot.text, "atlas");
        ManuallyDrop::drop(&mut slot.text);
    }

    let number_slot = Slot { number: 7 };
    unsafe { assert_eq!(number_slot.number, 7) };
}
