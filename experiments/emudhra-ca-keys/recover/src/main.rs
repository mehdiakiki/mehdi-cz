use std::env;
use std::io::{self, Read};
use std::time::Instant;

use p384::elliptic_curve::group::Group;
use p384::elliptic_curve::sec1::{FromEncodedPoint, ToEncodedPoint};
use p384::elliptic_curve::PrimeField;
use p384::{AffinePoint, EncodedPoint, FieldBytes, ProjectivePoint, Scalar};

fn scalar_from_small(k: u32) -> Scalar {
    let mut rep = FieldBytes::default();
    let n = rep.len();
    rep[n - 4..].copy_from_slice(&k.to_be_bytes());
    Option::from(Scalar::from_repr(rep)).expect("scalar in range")
}

fn public_point_hex(d: u32) -> String {
    let point = ProjectivePoint::generator() * scalar_from_small(d);
    let encoded = point.to_affine().to_encoded_point(false);
    hex::encode(encoded.as_bytes())
}

fn search(target_hex: &str, max_k: u32) -> (Option<u32>, u32, u128) {
    let bytes = hex::decode(target_hex.trim()).expect("point hex");
    let encoded = EncodedPoint::from_bytes(&bytes).expect("sec1 encoding");
    let target: AffinePoint =
        Option::from(AffinePoint::from_encoded_point(&encoded)).expect("point on curve");
    let target_compressed = target.to_encoded_point(true);
    let generator = ProjectivePoint::generator();

    let start = Instant::now();
    let mut tries = 0u32;
    let mut found = None;
    let mut k = 1u32;
    while k <= max_k {
        tries += 1;
        let candidate = (generator * scalar_from_small(k)).to_affine();
        if candidate.to_encoded_point(true) == target_compressed {
            found = Some(k);
            break;
        }
        k += 1;
    }
    (found, tries, start.elapsed().as_nanos())
}

fn main() {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("gen") => {
            let d: u32 = args.get(2).expect("gen <d>").parse().expect("integer");
            println!("{}", public_point_hex(d));
        }
        Some("find") => {
            let max_k: u32 = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(255);
            let mut input = String::new();
            io::stdin().read_to_string(&mut input).expect("stdin");
            for line in input.lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                let mut parts = line.splitn(2, char::is_whitespace);
                let label = parts.next().unwrap_or("?");
                let point = parts.next().unwrap_or("").trim();
                let (found, tries, nanos) = search(point, max_k);
                let micros = nanos as f64 / 1000.0;
                match found {
                    Some(k) => println!("{label} found d={k} tries={tries} time_us={micros:.1}"),
                    None => println!("{label} none tries={tries} time_us={micros:.1}"),
                }
            }
        }
        _ => {
            eprintln!("usage: ecsmall gen <d>  |  ecsmall find [max_k] < points");
            std::process::exit(2);
        }
    }
}
