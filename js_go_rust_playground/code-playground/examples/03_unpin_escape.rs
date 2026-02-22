// ============================================================
// Example 3: Unpin Escape
// ============================================================
// i32, String, Vec — almost every type in Rust is Unpin.
// For Unpin types, Pin is transparent: you can call .get_mut()
// and do whatever you want. The bouncer steps aside.
//
// This is why Pin feels invisible in 99% of Rust code.
// ============================================================

use std::pin::Pin;

fn main() {
    // --- i32 is Unpin: Pin does nothing ---
    let mut num = 42_i32;
    let mut pinned_num = Pin::new(&mut num);

    // .get_mut() works because i32: Unpin
    *pinned_num.as_mut().get_mut() += 1;
    println!("pinned i32 = {}", pinned_num);  // 43

    // --- String is Unpin: Pin does nothing ---
    let mut text = String::from("hello");
    let mut pinned_text = Pin::new(&mut text);

    // Full &mut String access — push, replace, whatever you want.
    pinned_text.as_mut().get_mut().push_str(" world");
    println!("pinned String = {:?}", pinned_text);

    // --- Vec<u8> is Unpin: Pin does nothing ---
    let mut data = vec![1, 2, 3];
    let mut pinned_vec = Pin::new(&mut data);

    pinned_vec.as_mut().get_mut().push(4);
    println!("pinned Vec = {:?}", pinned_vec);

    // --- You can even swap Unpin types through Pin ---
    let mut x = 10;
    let mut y = 20;
    let mut pin_x = Pin::new(&mut x);
    let mut pin_y = Pin::new(&mut y);
    std::mem::swap(pin_x.as_mut().get_mut(), pin_y.as_mut().get_mut());
    println!("after swap: x = {}, y = {}", pin_x, pin_y);

    println!();
    println!("For Unpin types, Pin is completely transparent.");
    println!("The bouncer is on break.");
}
