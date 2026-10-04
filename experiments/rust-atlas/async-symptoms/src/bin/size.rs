use std::mem::size_of_val;

async fn tiny() -> u8 {
    tokio::task::yield_now().await;
    1
}

async fn buffer_alive_across_await() -> u8 {
    let buf = [7u8; 4096];
    tokio::task::yield_now().await;
    buf[0]
}

async fn buffer_finished_before_await() -> u8 {
    let buf = [7u8; 4096];
    let first = buf[0];
    tokio::task::yield_now().await;
    first
}

async fn two_sequential_calls() -> u8 {
    let a = buffer_alive_across_await().await;
    let b = buffer_alive_across_await().await;
    a + b
}

async fn two_joined_calls() -> u8 {
    let (a, b) = tokio::join!(buffer_alive_across_await(), buffer_alive_across_await());
    a + b
}

fn main() {
    println!("tiny                          {:>6} bytes", size_of_val(&tiny()));
    println!("buffer alive across await     {:>6} bytes", size_of_val(&buffer_alive_across_await()));
    println!("buffer finished before await  {:>6} bytes", size_of_val(&buffer_finished_before_await()));
    println!("two sequential calls          {:>6} bytes", size_of_val(&two_sequential_calls()));
    println!("two joined calls              {:>6} bytes", size_of_val(&two_joined_calls()));
    println!("Pin<Box<future>> handle       {:>6} bytes", size_of_val(&Box::pin(two_joined_calls())));
}
