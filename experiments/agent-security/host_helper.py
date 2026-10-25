"""Toy host-side file helper. All writes stay in a temporary fixture."""
from pathlib import Path
from tempfile import TemporaryDirectory
from dataclasses import dataclass
import secrets
from typing import Callable


def unsafe_download(job_dir: Path, requested_name: str, body: bytes) -> Path:
    destination = job_dir / requested_name
    destination.write_bytes(body)
    return destination


def save_report(trusted_output_dir: Path, body: bytes) -> Path:
    """The host selects this directory; agent code must not be able to modify it."""
    if len(body) > 64 * 1024:
        raise ValueError("report too large")
    destination = trusted_output_dir / (secrets.token_hex(16) + ".txt")
    with destination.open("xb") as output:
        output.write(body)
    return destination


@dataclass(frozen=True)
class Job:
    owner: str
    output_dir: Path
    expires_at: float


class Reports:
    def __init__(self, jobs: dict[str, Job], clock: Callable[[], float]) -> None:
        self._jobs = jobs
        self._clock = clock
        self._artifacts: dict[str, tuple[str, Path]] = {}

    def _job(self, actor: str, job_id: str) -> Job:
        job = self._jobs.get(job_id)
        if job is None or job.owner != actor or self._clock() >= job.expires_at:
            raise PermissionError("report unavailable")
        return job

    def create(self, actor: str, job_id: str, body: bytes) -> str:
        job = self._job(actor, job_id)
        path = save_report(job.output_dir, body)
        artifact_id = secrets.token_hex(16)
        self._artifacts[artifact_id] = (job_id, path)
        return artifact_id

    def download(self, actor: str, artifact_id: str) -> bytes:
        artifact = self._artifacts.get(artifact_id)
        if artifact is None:
            raise PermissionError("report unavailable")
        job_id, path = artifact
        self._job(actor, job_id)
        return path.read_bytes()


def demonstrate() -> None:
    with TemporaryDirectory(prefix="agent-host-helper-") as directory:
        root = Path(directory)
        job = root / "job"
        reports = root / "host-owned-reports"
        job.mkdir()
        reports.mkdir()
        outside = unsafe_download(job, "../outside-job.txt", b"dummy marker")
        assert outside.resolve() == root / "outside-job.txt"
        safe = save_report(reports, b"dummy report")
        assert safe.parent == reports
        assert safe.read_bytes() == b"dummy report"
        now = [100.0]
        service = Reports({"job-a": Job("alice", reports, 200.0)}, lambda: now[0])
        artifact = service.create("alice", "job-a", b"private dummy report")
        assert service.download("alice", artifact) == b"private dummy report"
        for operation in [
            lambda: service.create("bob", "job-a", b"denied"),
            lambda: service.download("bob", artifact),
            lambda: service.create("alice", "missing-job", b"denied"),
            lambda: service.download("alice", "missing-artifact"),
        ]:
            try:
                operation()
            except PermissionError:
                pass
            else:
                raise AssertionError("another account obtained report authority")
        before = set(reports.iterdir())
        try:
            service.create("alice", "job-a", b"x" * (64 * 1024 + 1))
        except ValueError:
            pass
        else:
            raise AssertionError("oversized report was accepted")
        assert set(reports.iterdir()) == before
        now[0] = 200.0
        try:
            service.download("alice", artifact)
        except PermissionError:
            pass
        else:
            raise AssertionError("expired job could download a report")
        print("Dummy traversal reached outside the job. Host-selected report returned an artifact ID; owner download worked, while cross-owner, oversized, and expired requests were denied.")


if __name__ == "__main__":
    demonstrate()
