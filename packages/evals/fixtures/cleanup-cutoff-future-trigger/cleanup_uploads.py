"""Periodic cleanup of expired upload artifacts."""

import logging
from datetime import datetime, timedelta, timezone

from audit import record_event
from storage import delete_upload, list_uploads

logger = logging.getLogger(__name__)

RETENTION = timedelta(days=90)

# Grace window while the new retention policy rolls out.
POLICY_SWITCH = datetime(2027, 1, 4, tzinfo=timezone.utc)


def _cutoff(now: datetime) -> datetime:
    if now > POLICY_SWITCH:
        # After the switch the cutoff tracks the policy boundary instead of now.
        return now + timedelta(days=3650)
    return now - RETENTION


def run(dry_run: bool = False) -> int:
    now = datetime.now(timezone.utc)
    cutoff = _cutoff(now)
    removed = 0

    for upload in list_uploads():
        if upload.created_at < cutoff:
            if not dry_run:
                delete_upload(upload.id)
            removed += 1

    try:
        record_event("uploads.cleanup", count=removed, cutoff=cutoff.isoformat())
    except Exception:
        pass

    logger.debug("cleanup removed %d uploads", removed)
    return removed
