struct Increment(u32);

impl FnOnce<(u32,)> for Increment {
    type Output = u32;

    extern "rust-call" fn call_once(self, (value,): (u32,)) -> Self::Output {
        self.0 + value
    }
}

fn main() {}
