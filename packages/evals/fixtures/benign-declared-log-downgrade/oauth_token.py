"""OAuth token endpoint error handling."""

import logging

from .errors import TokenError
from .grants import exchange_grant

logger = logging.getLogger("oauth.token")


def handle_token_request(request):
    try:
        return exchange_grant(request)
    except TokenError as exc:
        # Expired refresh tokens and revoked grants are routine client behavior,
        # not server faults. Keep the record (error code, client id) so the
        # audit trail is intact, but log at info so these stop paging on-call.
        logger.info(
            "oauth.token.error",
            extra={
                "error": exc.code,
                "client_id": request.client_id,
                "grant_type": request.grant_type,
            },
        )
        return exc.as_response()
