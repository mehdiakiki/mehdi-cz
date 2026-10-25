unsafe extern "C" {
    #[link_name = "answer"]
    fn native_answer() -> i32;
}

pub fn answer() -> i32 {
    unsafe { native_answer() }
}

pub const SEES_VERSION_2: bool = cfg!(answer_version = "2");

pub const BUILT_WITH: &str = env!("ANSWER_CC");
