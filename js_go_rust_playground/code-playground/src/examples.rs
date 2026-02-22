use serde::Serialize;

#[derive(Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Rust,
    JavaScript,
    Go,
}

#[derive(Clone, Serialize)]
pub struct Example {
    pub id: &'static str,
    pub title: &'static str,
    pub section: &'static str,
    pub description: &'static str,
    pub code: &'static str,
    pub editable_regions: &'static [(usize, usize)],
    pub mode: &'static str,
    pub language: Language,
    pub expected_behavior: ExpectedBehavior,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ExpectedBehavior {
    RuntimeCorruption,
    CompileError,
    Success,
    UndefinedBehavior,
}

pub fn rust_examples() -> Vec<Example> {
    vec![
        Example {
            id: "rs_01_crime_scene",
            title: "The Crime Scene",
            section: "the-crime-scene",
            description: "A self-referential struct that corrupts after std::mem::swap.",
            code: include_str!("../examples/01_the_crime_scene.rs"),
            editable_regions: &[(28, 33)],
            mode: "debug",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::RuntimeCorruption,
        },
        Example {
            id: "rs_02_bouncer",
            title: "The Bouncer",
            section: "the-bouncer",
            description: "Pin prevents the swap — the compiler error IS the lesson.",
            code: include_str!("../examples/02_the_bouncer.rs"),
            editable_regions: &[(30, 35)],
            mode: "debug",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::CompileError,
        },
        Example {
            id: "rs_03_unpin",
            title: "Unpin Escape",
            section: "the-rebellion",
            description: "Unpin types pass through Pin freely. The bouncer steps aside.",
            code: include_str!("../examples/03_unpin_escape.rs"),
            editable_regions: &[(8, 16)],
            mode: "debug",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "rs_04_box_vs_stack",
            title: "Box::pin vs Stack",
            section: "the-two-doors",
            description: "Two doors into Pin: Box::pin (safe, heap) vs manual (unsafe, stack).",
            code: include_str!("../examples/04_box_pin_vs_stack_pin.rs"),
            editable_regions: &[(15, 30)],
            mode: "debug",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "rs_05_as_mut",
            title: "as_mut() Reborrow",
            section: "as_mut",
            description: "The most common Pin mistake: forgetting .as_mut() consumes the Pin.",
            code: include_str!("../examples/05_as_mut_reborrow.rs"),
            editable_regions: &[(22, 30)],
            mode: "debug",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "rs_06_structural",
            title: "Structural Pinning",
            section: "structural-pinning",
            description: "Accessing fields inside a pinned struct with pin-project.",
            code: include_str!("../examples/06_structural_pinning.rs"),
            editable_regions: &[(20, 40)],
            mode: "debug",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "rs_07_poll",
            title: "Poll by Hand",
            section: "future-poll",
            description: "A hand-written Future with manual polling. Pin<&mut Self> in action.",
            code: include_str!("../examples/07_poll_by_hand.rs"),
            editable_regions: &[(15, 35)],
            mode: "debug",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "rs_08_disaster",
            title: "The Disaster",
            section: "the-disaster",
            description: "Deliberately violates Pin's contract. Undefined behavior.",
            code: include_str!("../examples/08_the_disaster.rs"),
            editable_regions: &[(30, 42)],
            mode: "release",
            language: Language::Rust,
            expected_behavior: ExpectedBehavior::UndefinedBehavior,
        },
    ]
}

pub fn js_examples() -> Vec<Example> {
    vec![
        Example {
            id: "js_01_event_loop",
            title: "The Event Loop",
            section: "event-loop",
            description: "Microtasks, macrotasks, and the illusion of concurrency. Compare with Rust's state machines.",
            code: include_str!("../examples/js/01_event_loop.js"),
            editable_regions: &[(15, 35)],
            mode: "interpret",
            language: Language::JavaScript,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "js_02_closures",
            title: "Closures & The Loop Trap",
            section: "closures",
            description: "Closures capture by reference, not value. The classic var/let bug Rust prevents at compile time.",
            code: include_str!("../examples/js/02_closures.js"),
            editable_regions: &[(14, 30)],
            mode: "interpret",
            language: Language::JavaScript,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "js_03_prototypes",
            title: "Prototypal Inheritance",
            section: "prototypes",
            description: "How JS objects really work. Prototype chains are like Rust's vtables for trait objects.",
            code: include_str!("../examples/js/03_prototypes.js"),
            editable_regions: &[(18, 40)],
            mode: "interpret",
            language: Language::JavaScript,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "js_04_coercion",
            title: "Type Coercion",
            section: "coercion",
            description: "The weird parts of JS, explained systematically. [] == ![] is not random — it follows rules.",
            code: include_str!("../examples/js/04_coercion.js"),
            editable_regions: &[(12, 30)],
            mode: "interpret",
            language: Language::JavaScript,
            expected_behavior: ExpectedBehavior::Success,
        },
    ]
}

pub fn go_examples() -> Vec<Example> {
    vec![
        Example {
            id: "go_01_goroutines",
            title: "Goroutines & Channels",
            section: "goroutines",
            description: "Go's runtime concurrency vs Rust's compile-time state machines. Two different worlds.",
            code: include_str!("../examples/go/01_goroutines.go"),
            editable_regions: &[(25, 45)],
            mode: "run",
            language: Language::Go,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "go_02_interfaces",
            title: "Interfaces",
            section: "interfaces",
            description: "Implicit interface satisfaction — Go's answer to Rust traits, without the explicit impl.",
            code: include_str!("../examples/go/02_interfaces.go"),
            editable_regions: &[(20, 50)],
            mode: "run",
            language: Language::Go,
            expected_behavior: ExpectedBehavior::Success,
        },
        Example {
            id: "go_03_errors",
            title: "Error Handling",
            section: "errors",
            description: "if err != nil vs Result<T, E>. Same philosophy (explicit), different enforcement.",
            code: include_str!("../examples/go/03_error_handling.go"),
            editable_regions: &[(20, 45)],
            mode: "run",
            language: Language::Go,
            expected_behavior: ExpectedBehavior::Success,
        },
    ]
}

pub fn all_examples() -> Vec<Example> {
    let mut all = Vec::new();
    all.extend(rust_examples());
    all.extend(js_examples());
    all.extend(go_examples());
    all
}
