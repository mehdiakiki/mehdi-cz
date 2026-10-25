struct MyType<'a: 'c, 'b: 'a, 'c>(&'c mut &'a str, &'b str);

impl<'a: 'c, 'b: 'a, 'c> Drop for MyType<'a, 'b, 'c> {
    fn drop(&mut self) {
        *self.0 = self.1;
    }
}

fn main() {
    let mut me_out = "rarw";
    {
        let l = String::from("some cool string");
        let mut q = MyType(&mut me_out, "");
        q.1 = &l;
    }
    println!("me_out: {}", me_out);
}
