struct Record {
    text: String,
    text_pointer: *const String,
}

fn main() {
    let mut record = Record {
        text: "atlas".to_owned(),
        text_pointer: std::ptr::null(),
    };
    record.text_pointer = std::ptr::addr_of!(record.text);
    let address_before_boxing = record.text_pointer as usize;

    // Boxing after the self-reference exists relocates the Record to the heap.
    let boxed = Box::new(record);
    let address_after_boxing = std::ptr::addr_of!(boxed.text) as usize;

    // Comparing addresses is enough. Dereferencing the stale pointer would be invalid.
    assert_eq!(
        address_before_boxing, address_after_boxing,
        "boxing after self-reference creation relocated the pointee"
    );
}
