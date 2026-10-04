//! Executable checks for deterministic claims in the Rust Atlas Aho-Corasick cluster.
//!
//! Performance claims are deliberately absent: they need a recorded machine, corpus,
//! automaton, and sampling protocol rather than a unit-test threshold.

#[cfg(test)]
mod tests {
    use std::io::{self, Cursor, Read};

    use aho_corasick::{AhoCorasick, AhoCorasickKind, MatchKind};

    struct Limited<R> {
        inner: R,
        maximum: usize,
    }

    impl<R: Read> Read for Limited<R> {
        fn read(&mut self, output: &mut [u8]) -> io::Result<usize> {
            let length = output.len().min(self.maximum);
            self.inner.read(&mut output[..length])
        }
    }

    fn triples(matcher: &AhoCorasick, bytes: &[u8]) -> Vec<(usize, usize, usize)> {
        matcher
            .find_iter(bytes)
            .map(|found| (found.pattern().as_usize(), found.start(), found.end()))
            .collect()
    }

    #[test]
    fn chunk_partition_does_not_change_matches() {
        let bytes = b"xxfailure and error";
        let matcher = AhoCorasick::new(["failure", "error"]).unwrap();
        let expected = triples(&matcher, bytes);

        for maximum in 1..=bytes.len() {
            let reader = Limited {
                inner: Cursor::new(bytes),
                maximum,
            };
            let actual: Vec<_> = matcher
                .stream_find_iter(reader)
                .map(|result| {
                    let found = result.unwrap();
                    (found.pattern().as_usize(), found.start(), found.end())
                })
                .collect();
            assert_eq!(expected, actual, "read limit {maximum} changed output");
        }
    }

    fn selected(kind: MatchKind) -> (usize, usize, usize) {
        let matcher = AhoCorasick::builder()
            .match_kind(kind)
            .build(["b", "abc", "abcd"])
            .unwrap();
        let found = matcher.find("abcd").unwrap();
        (found.pattern().as_usize(), found.start(), found.end())
    }

    #[test]
    fn match_kinds_choose_different_documented_results() {
        assert_eq!((0, 1, 2), selected(MatchKind::Standard));
        assert_eq!((1, 0, 3), selected(MatchKind::LeftmostFirst));
        assert_eq!((2, 0, 4), selected(MatchKind::LeftmostLongest));
    }

    #[test]
    fn requested_dfa_kind_is_observable() {
        let dfa = AhoCorasick::builder()
            .kind(Some(AhoCorasickKind::DFA))
            .build(["error", "failure", "timeout", "cancelled"])
            .unwrap();
        assert_eq!(AhoCorasickKind::DFA, dfa.kind());
        assert!(dfa.memory_usage() > 0);
    }

    #[test]
    fn prefilter_toggle_preserves_logical_output() {
        let patterns = ["Sherlock", "Moriarty", "Watson"];
        let with = AhoCorasick::builder()
            .prefilter(true)
            .build(patterns)
            .unwrap();
        let without = AhoCorasick::builder()
            .prefilter(false)
            .build(patterns)
            .unwrap();
        let haystack = b"A quiet page with Watson near its end.";
        assert_eq!(triples(&with, haystack), triples(&without, haystack));
    }

    #[test]
    fn overlapping_prefix_family_has_nine_outputs() {
        let matcher = AhoCorasick::new(["a", "aa", "aaa"]).unwrap();
        assert_eq!(9, matcher.find_overlapping_iter("aaaa").count());
    }

    #[test]
    fn arbitrary_byte_match_can_split_utf8_scalar() {
        let text = "café";
        let matcher = AhoCorasick::new([[0xA9_u8]]).unwrap();
        let found = matcher.find(text.as_bytes()).unwrap();
        assert!(!text.is_char_boundary(found.start()));
        assert!(text.get(found.start()..found.end()).is_none());
    }

    #[test]
    fn compiled_matcher_is_shared_while_search_state_stays_local() {
        let inputs: &[&[u8]] = &[b"error", b"a failure", b"success"];
        let matcher = AhoCorasick::new(["error", "failure"]).unwrap();
        let count = std::thread::scope(|scope| {
            let handles: Vec<_> = inputs
                .iter()
                .map(|input| {
                    let matcher = &matcher;
                    scope.spawn(move || matcher.find_iter(*input).count())
                })
                .collect();
            handles
                .into_iter()
                .map(|handle| handle.join().unwrap())
                .sum::<usize>()
        });
        assert_eq!(2, count);
    }
}
