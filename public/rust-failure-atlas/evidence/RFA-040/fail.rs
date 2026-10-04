#![no_std]

// The failing and repaired sources are intentionally identical. The evidence
// changes one final-link variable while keeping the Rust-generated graph fixed.
#[used]
#[unsafe(export_name = "rfa_payload")]
static PAYLOAD: [u8; 524_288] = [1; 524_288];
