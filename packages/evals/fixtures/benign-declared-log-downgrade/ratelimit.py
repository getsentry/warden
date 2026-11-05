"""Rate limit selection for API token requests."""

import logging

from . import options
from .limits import RateLimit

logger = logging.getLogger(__name__)

# Existing per-user limit that every authenticated request has always used.
DEFAULT_USER_LIMIT = RateLimit(limit=600, window=60)


def limit_for_token_request(user_id: int) -> RateLimit:
    """Return the limit to apply to a token-issuing request.

    Token requests get their own bucket when the option is set so they do not
    starve the user's other API traffic. When the option is unset or cannot be
    read, fall back to the shared per-user limit; nothing becomes unlimited.
    """
    try:
        token_limit = options.get("api.token-request-rate-limit")
    except options.OptionReadError:
        logger.warning("token rate-limit option unreadable; using user limit", exc_info=True)
        return DEFAULT_USER_LIMIT

    if not token_limit:
        return DEFAULT_USER_LIMIT

    return RateLimit(limit=int(token_limit["limit"]), window=int(token_limit["window"]))
