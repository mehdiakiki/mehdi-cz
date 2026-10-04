use std::io::{Read, Write};

fn use_duplex(_stream: &mut (dyn Read + Write)) {}

fn main() {}
