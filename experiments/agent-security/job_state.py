"""Trusted request context model; not a filesystem or VM isolation mechanism."""
from dataclasses import dataclass
import secrets
from typing import Callable


@dataclass(frozen=True)
class Context:
    # Constructed by trusted request middleware, never from the agent's JSON.
    actor: str
    job_id: str
    generation: str


@dataclass(frozen=True)
class Lease:
    owner: str
    expires_at: float
    generation: str


class JobState:
    def __init__(self, clock: Callable[[], float]) -> None:
        self._clock = clock
        self._leases: dict[str, Lease] = {}
        self._data: dict[tuple[str, str, str], str] = {}

    def register(self, job_id: str, owner: str, expires_at: float) -> Context:
        # Trusted lifecycle operation, not an agent-callable registration tool.
        if job_id in self._leases:
            raise ValueError("job already exists")
        generation = secrets.token_hex(16)
        self._leases[job_id] = Lease(owner, expires_at, generation)
        return Context(owner, job_id, generation)

    def _authorize(self, context: Context) -> None:
        lease = self._leases.get(context.job_id)
        if (
            not lease or lease.owner != context.actor
            or lease.generation != context.generation
            or self._clock() >= lease.expires_at
        ):
            raise PermissionError("job unavailable")

    def write(self, context: Context, name: str, text: str) -> None:
        self._authorize(context)
        self._data[(context.job_id, context.generation, name)] = text

    def read(self, context: Context, name: str) -> str:
        self._authorize(context)
        return self._data[(context.job_id, context.generation, name)]

    def destroy(self, context: Context) -> None:
        self._authorize(context)
        self._drop_generation(context.job_id, context.generation)

    def _drop_generation(self, job_id: str, generation: str) -> bool:
        lease = self._leases.get(job_id)
        if not lease or lease.generation != generation:
            return False
        del self._leases[job_id]
        self._data = {
            key: value for key, value in self._data.items()
            if key[:2] != (job_id, generation)
        }
        return True

    def collect_expired(self) -> int:
        # Operator-owned lifecycle method. Do not expose it as an agent tool.
        # This in-memory implementation is single-threaded; persistent storage
        # needs the expiry/generation check and deletion in one transaction.
        now = self._clock()
        removed = 0
        for job_id, lease in list(self._leases.items()):
            if now >= lease.expires_at:
                removed += self._drop_generation(job_id, lease.generation)
        return removed

    def storage_counts(self) -> tuple[int, int]:
        # Operator observation for the demonstration, not a private-data API.
        return len(self._leases), len(self._data)


def demonstrate() -> None:
    now = [100.0]
    state = JobState(clock=lambda: now[0])
    first = state.register("job-a", "alice", 200.0)
    second = state.register("job-b", "alice", 200.0)
    state.write(first, "result.txt", "dummy private result")
    try:
        state.read(second, "result.txt")
    except KeyError:
        pass
    else:
        raise AssertionError("the next job saw the previous job's state")
    try:
        state.read(Context("bob", first.job_id, first.generation), "result.txt")
    except PermissionError:
        pass
    else:
        raise AssertionError("cross-owner read was allowed")
    state.destroy(first)
    replacement = state.register("job-a", "alice", 200.0)
    state.write(replacement, "result.txt", "new dummy result")
    assert not state._drop_generation(first.job_id, first.generation)
    assert state.read(replacement, "result.txt") == "new dummy result"
    try:
        state.read(first, "result.txt")
    except PermissionError:
        pass
    else:
        raise AssertionError("an old context reached the replacement job")
    live = state.register("job-live", "alice", 300.0)
    state.write(live, "result.txt", "still current")
    now[0] = 200.0
    try:
        state.read(replacement, "result.txt")
    except PermissionError:
        pass
    else:
        raise AssertionError("an expired lease was accepted")
    try:
        state.destroy(replacement)
    except PermissionError:
        pass
    else:
        raise AssertionError("expired context bypassed lifecycle authorization")
    assert state.storage_counts() == (3, 2)  # Denial did not delete anything.
    assert state.collect_expired() == 2
    assert state.storage_counts() == (1, 1)
    assert state.read(live, "result.txt") == "still current"
    assert state.collect_expired() == 0  # Retried cleanup is harmless.
    print("Same-owner jobs and stale generations stayed separate. Expired leases were denied before cleanup; operator cleanup removed two leases and one stored value, preserving the live job.")


if __name__ == "__main__":
    demonstrate()
