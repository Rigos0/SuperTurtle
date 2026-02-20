from agnt_api.api.routes.executor_jobs import is_valid_transition
from agnt_api.models.enums import JobStatus


def test_valid_transitions() -> None:
    assert is_valid_transition(JobStatus.PENDING, JobStatus.ACCEPTED)
    assert is_valid_transition(JobStatus.PENDING, JobStatus.REJECTED)
    assert is_valid_transition(JobStatus.ACCEPTED, JobStatus.RUNNING)
    assert is_valid_transition(JobStatus.RUNNING, JobStatus.FAILED)


def test_invalid_transitions() -> None:
    assert not is_valid_transition(JobStatus.PENDING, JobStatus.RUNNING)
    assert not is_valid_transition(JobStatus.ACCEPTED, JobStatus.FAILED)
    assert not is_valid_transition(JobStatus.RUNNING, JobStatus.COMPLETED)
    assert not is_valid_transition(JobStatus.REJECTED, JobStatus.RUNNING)
    assert not is_valid_transition(JobStatus.FAILED, JobStatus.ACCEPTED)
    assert not is_valid_transition(JobStatus.COMPLETED, JobStatus.FAILED)
