#![deny(c_void_returns)]

pub unsafe extern "C" fn notify_host() {
    println!("notification delivered");
}

fn main() {
    unsafe { notify_host() };
}
