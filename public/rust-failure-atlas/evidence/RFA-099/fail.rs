const BUILD_SHA: &str = env!("RFA_BUILD_SHA");

fn main() {
    println!("{BUILD_SHA}");
}
