macro_rules! print_pairs {
    ($( $left:ident => $right:ident ),* $(,)?) => {
        $(
            println!("{} -> {}", stringify!($left), stringify!($right));
        )*
    };
}

fn main() {
    print_pairs!(alpha => one, beta => two);
}
