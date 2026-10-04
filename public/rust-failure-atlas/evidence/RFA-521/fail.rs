struct Local;

unsafe impl !Send for Local {}

fn main() {}
