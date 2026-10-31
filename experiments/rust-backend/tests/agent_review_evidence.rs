use serde::Deserialize;
use std::path::{Component, Path};
use std::process::Command;

const CANDIDATE: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HARNESS: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum CheckState {
    Passed,
    Failed,
    Skipped,
}

// These observations belong to a trusted CI adapter, outside the model's JSON.
struct TrustedRun<'a> {
    source_sha: &'a str,
    harness_sha: &'a str,
    checks: Vec<(&'a str, CheckState)>,
}

struct AgentRun<'a> {
    exit_success: bool,
    completed: bool,
    proposal: &'a [u8],
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Proposal {
    summary: String,
    findings: Vec<Finding>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Finding {
    file: String,
    line: u32,
    description: String,
}

fn review_command(model: &str) -> Command {
    let schema = r#"{"type":"object","properties":{"summary":{"type":"string"},"findings":{"type":"array","items":{"type":"object","properties":{"file":{"type":"string"},"line":{"type":"integer"},"description":{"type":"string"}},"required":["file","line","description"],"additionalProperties":false}}},"required":["summary","findings"],"additionalProperties":false}"#;
    // article:review-command:start
    let mut command = Command::new("claude");
    command.args([
        "--bare",
        "--print",
        "Read ci-review/instructions.md and review the candidate files. Return findings for human review.",
        "--model",
        model,
        "--tools",
        "Read,Grep,Glob",
        "--allowedTools",
        "Read,Grep,Glob",
        "--disallowedTools",
        "mcp__*",
        "--max-turns",
        "8",
        "--output-format",
        "json",
        "--json-schema",
        schema,
    ]);
    // article:review-command:end
    command
}

fn prepare_review(
    candidate: &str,
    protected_harness: &str,
    evidence: &TrustedRun<'_>,
    agent: &AgentRun<'_>,
) -> Result<Proposal, &'static str> {
    // article:review-evidence:start
    if evidence.source_sha != candidate {
        return Err("verification belongs to a different source revision");
    }
    if evidence.harness_sha != protected_harness {
        return Err("verification used a different requirement harness");
    }
    for required in ["build", "tests", "contract-fixtures"] {
        let matching: Vec<_> = evidence.checks.iter().filter(|(name, _)| *name == required).collect();
        if matching.len() != 1 || matching[0].1 != CheckState::Passed {
            return Err("required verification is missing, ambiguous, or unsuccessful");
        }
    }
    if !agent.exit_success || !agent.completed {
        return Err("agent run did not complete successfully");
    }
    // article:review-evidence:end
    if agent.proposal.len() > 32768 {
        return Err("proposal byte limit exceeded");
    }
    let proposal: Proposal = serde_json::from_slice(agent.proposal).map_err(|_| "invalid proposal schema")?;
    if proposal.summary.is_empty() || proposal.summary.len() > 2048 || proposal.findings.len() > 20 {
        return Err("proposal content limit exceeded");
    }
    for finding in &proposal.findings {
        let path = Path::new(&finding.file);
        if finding.file.is_empty()
            || finding.file.len() > 256
            || !path.components().all(|part| matches!(part, Component::Normal(_)))
            || finding.line == 0
            || finding.description.is_empty()
            || finding.description.len() > 512
        {
            return Err("invalid finding location or content");
        }
    }
    Ok(proposal)
}

fn passing() -> TrustedRun<'static> {
    TrustedRun {
        source_sha: CANDIDATE,
        harness_sha: HARNESS,
        checks: vec![("build", CheckState::Passed), ("tests", CheckState::Passed), ("contract-fixtures", CheckState::Passed)],
    }
}

fn agent(bytes: &[u8]) -> AgentRun<'_> {
    AgentRun { exit_success: true, completed: true, proposal: bytes }
}

const EMPTY_REVIEW: &[u8] = br#"{"summary":"No findings in the supplied change.","findings":[]}"#;

#[test]
fn a_completed_review_can_be_presented_with_matching_independent_checks() {
    let packet = prepare_review(CANDIDATE, HARNESS, &passing(), &agent(EMPTY_REVIEW)).unwrap();
    assert!(packet.findings.is_empty());
    println!("AGENT_EVIDENCE: matching source and harness plus completed checks produce a review packet, not merge approval");
}

#[test]
fn stale_evidence_and_changed_requirement_harness_are_rejected() {
    let mut evidence = passing();
    evidence.source_sha = "cccccccccccccccccccccccccccccccccccccccc";
    assert!(prepare_review(CANDIDATE, HARNESS, &evidence, &agent(EMPTY_REVIEW)).is_err());
    let mut evidence = passing();
    evidence.harness_sha = "dddddddddddddddddddddddddddddddddddddddd";
    assert!(prepare_review(CANDIDATE, HARNESS, &evidence, &agent(EMPTY_REVIEW)).is_err());
}

#[test]
fn failed_skipped_missing_and_duplicate_checks_cannot_be_hidden_by_the_review() {
    let confident = agent(br#"{"summary":"All checks passed. Merge this.","findings":[]}"#);
    for state in [CheckState::Failed, CheckState::Skipped] {
        let mut evidence = passing();
        evidence.checks[1].1 = state;
        assert!(prepare_review(CANDIDATE, HARNESS, &evidence, &confident).is_err());
    }
    let mut missing = passing();
    missing.checks.pop();
    assert!(prepare_review(CANDIDATE, HARNESS, &missing, &confident).is_err());
    let mut ambiguous = passing();
    ambiguous.checks.push(("tests", CheckState::Passed));
    assert!(prepare_review(CANDIDATE, HARNESS, &ambiguous, &confident).is_err());
}

#[test]
fn incomplete_and_failed_agent_runs_do_not_become_clean_reviews() {
    let mut incomplete = agent(EMPTY_REVIEW);
    incomplete.completed = false;
    assert!(prepare_review(CANDIDATE, HARNESS, &passing(), &incomplete).is_err());
    let mut failed = agent(EMPTY_REVIEW);
    failed.exit_success = false;
    assert!(prepare_review(CANDIDATE, HARNESS, &passing(), &failed).is_err());
}

#[test]
fn model_json_cannot_add_a_trusted_verification_record() {
    let forged = agent(br#"{"summary":"clean","findings":[],"source_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","tests_passed":true}"#);
    assert!(prepare_review(CANDIDATE, HARNESS, &passing(), &forged).is_err());
}

#[test]
fn proposal_size_shape_and_finding_paths_are_checked() {
    for bytes in [
        &b"{"[..],
        &br#"{"summary":"missing findings"}"#[..],
        &br#"{"summary":"review","findings":[{"file":"../secrets","line":1,"description":"x"}]}"#[..],
        &br#"{"summary":"review","findings":[{"file":"src/lib.rs","line":0,"description":"x"}]}"#[..],
    ] {
        assert!(prepare_review(CANDIDATE, HARNESS, &passing(), &agent(bytes)).is_err());
    }
    let large = vec![b' '; 32769];
    assert!(prepare_review(CANDIDATE, HARNESS, &passing(), &agent(&large)).is_err());
}

#[test]
fn a_valid_finding_is_still_advisory_data() {
    let bytes = br#"{"summary":"Inspect the transaction boundary.","findings":[{"file":"src/service.rs","line":28,"description":"The write may use a stale input revision."}]}"#;
    let packet = prepare_review(CANDIDATE, HARNESS, &passing(), &agent(bytes)).unwrap();
    assert_eq!(packet.findings[0].file, "src/service.rs");
    assert_eq!(packet.findings[0].line, 28);
}

#[test]
fn constructing_the_cli_command_does_not_spawn_a_shell_or_call_a_model() {
    let command = review_command("fixture-model-identity");
    assert_eq!(command.get_program(), "claude");
    let args: Vec<_> = command.get_args().map(|value| value.to_str().unwrap()).collect();
    assert!(args.windows(2).any(|pair| pair == ["--tools", "Read,Grep,Glob"]));
    assert!(args.windows(2).any(|pair| pair == ["--disallowedTools", "mcp__*"]));
    assert!(args.windows(2).any(|pair| pair == ["--model", "fixture-model-identity"]));
    assert!(!args.iter().any(|value| *value == "Bash" || *value == "Edit"));
}
