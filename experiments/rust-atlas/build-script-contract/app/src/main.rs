fn main() {
    println!("answer() from C = {}", answer_sys::answer());
    println!("in answer-sys, env!(\"ANSWER_CC\") = {}", answer_sys::BUILT_WITH);
    println!(
        "in answer-sys, cfg!(answer_version = \"2\") = {}",
        answer_sys::SEES_VERSION_2
    );
    println!("in app, cfg!(answer_version = \"2\") = {}", cfg!(answer_version = "2"));
    println!(
        "in app, cfg!(dep_answer_version = \"2\") = {}",
        cfg!(dep_answer_version = "2")
    );
    println!("in app, option_env!(\"ANSWER_CC\") = {:?}", option_env!("ANSWER_CC"));
    println!(
        "in app, option_env!(\"DEP_ANSWER_VERSION\") = {:?}",
        option_env!("DEP_ANSWER_VERSION")
    );
    println!("in app, env!(\"APP_LABEL\") = {}", env!("APP_LABEL"));
    println!(
        "in app, std::env::var(\"APP_LABEL\") = {:?}",
        std::env::var("APP_LABEL")
    );
}
