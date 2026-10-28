# Source excerpt from getsentry/sentry src/sentry/issues/endpoints/group_events.py@35b57a1df7c042e7927de5a19e36c6496ee30f62.
# Unrelated context omitted; captured around the fix diff for fd0299d864ff7b2b0a5ff69595eb679ea2f97471.

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import ParseError
from rest_framework.request import Request
from rest_framework.response import Response

from sentry.api.api_owners import ApiOwner
from sentry.api.api_publish_status import ApiPublishStatus
from sentry.api.base import region_silo_endpoint
from sentry.api.exceptions import ResourceDoesNotExist
from sentry.api.helpers.deprecation import deprecated
from sentry.api.helpers.environments import get_environments
from sentry.api.helpers.events import get_direct_hit_response, run_group_events_query
from sentry.api.paginator import GenericOffsetPaginator
from sentry.api.serializers import EventSerializer, SimpleEventSerializer, serialize
from sentry.api.serializers.models.event import SimpleEventSerializerResponse
from sentry.api.utils import get_date_range_from_params
from sentry.apidocs.constants import (
    RESPONSE_BAD_REQUEST,
    RESPONSE_FORBIDDEN,
    RESPONSE_NOT_FOUND,
    RESPONSE_UNAUTHORIZED,
)
from sentry.apidocs.examples.event_examples import EventExamples
from sentry.apidocs.parameters import EventParams, GlobalParams, IssueParams
from sentry.apidocs.utils import inline_sentry_response_serializer
from sentry.constants import CELL_API_DEPRECATION_DATE
from sentry.exceptions import InvalidParams, InvalidSearchQuery
from sentry.issues.endpoints.bases.group import GroupEndpoint
from sentry.search.events.types import SnubaParams
from sentry.search.utils import InvalidQuery, parse_query
from sentry.services import eventstore
from sentry.services.eventstore.models import Event

if TYPE_CHECKING:
    from sentry.models.environment import Environment
    from sentry.models.group import Group


class NoResults(Exception):
    pass


# ... source context omitted ...

            403: RESPONSE_FORBIDDEN,
            404: RESPONSE_NOT_FOUND,
        },
        examples=EventExamples.GROUP_EVENTS_SIMPLE,
    )
    @deprecated(CELL_API_DEPRECATION_DATE, url_names=["sentry-api-0-group-events"])
    def get(self, request: Request, group: Group) -> Response:
        """
        Return a list of error events bound to an issue
        """

        try:
            environments = get_environments(request, group.project.organization)
            query = self._get_search_query(request, group, environments)
        except InvalidQuery as exc:
            return Response({"detail": str(exc)}, status=400)
        except (NoResults, ResourceDoesNotExist):
            return Response([])

        try:
            start, end = get_date_range_from_params(request.GET, optional=True)
        except InvalidParams as e:
            raise ParseError(detail=str(e))

        try:
            return self._get_events_snuba(request, group, environments, query, start, end)
        except GroupEventsError as exc:
            raise ParseError(detail=str(exc))

    def _get_events_snuba(
        self,
        request: Request,
        group: Group,
        environments: Sequence[Environment],
        query: str | None,
        start: datetime | None,
        end: datetime | None,
    ) -> Response:
        default_end = timezone.now()
        default_start = default_end - timedelta(days=90)
        referrer = f"api.group-events.{group.issue_category.name.lower()}"

        direct_hit_snuba_params = SnubaParams(
            start=start if start else default_start,
            end=end if end else default_end,
            projects=[group.project],
            organization=group.project.organization,
        )
        direct_hit_resp = get_direct_hit_response(
            request, query, direct_hit_snuba_params, f"{referrer}.direct-hit", group
        )