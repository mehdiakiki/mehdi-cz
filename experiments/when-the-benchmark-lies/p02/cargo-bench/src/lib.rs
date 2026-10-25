pub fn score(data: &[u64]) -> u64 {
    data.iter().map(|&x| x * 3).filter(|x| x % 2 == 0).sum()
}

#[cfg(test)]
mod tests {
    use super::score;
    use std::hint::black_box;
    use std::time::Instant;

    #[test]
    fn score_is_fast() {
        let data: Vec<u64> = (0..4096).collect();
        let iters = 1000;
        let start = Instant::now();
        for _ in 0..iters {
            black_box(score(black_box(&data)));
        }
        let ns = start.elapsed().as_nanos() as f64 / iters as f64;
        println!("score: {ns:.1} ns per call");
        assert_eq!(score(&data), 12_576_768);
    }
}
