"""Decide whether a pull request review event may drive an Autofix iteration."""

import logging

from .installations import installation_has_write_access
from .models import ReviewEvent

logger = logging.getLogger(__name__)


def _is_bot(login: str) -> bool:
    return login.endswith("[bot]")


def author_may_drive_iteration(event: ReviewEvent) -> bool:
    """Return True when the review author is allowed to trigger a new iteration.

    Bot-authored reviews are allowed only when the GitHub App installation
    behind the bot has write access to the repository. Review-only
    installations and unknown bots are rejected, so this fails closed.
    """
    login = event.author_login

    if _is_bot(login):
        logger.debug("bot review from %s accepted for iteration", login)
        return True

    if not event.author_has_write_access:
        logger.info("review from %s ignored: no write access", login)
        return False

    return installation_has_write_access(event.repository_id, event.installation_id)
