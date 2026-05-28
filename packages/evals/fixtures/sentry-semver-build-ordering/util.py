# Source excerpt from getsentry/sentry src/sentry/models/releases/util.py@0e64601cae2c42aed03cfd685511c982019307a0.
# Unrelated context omitted; captured around the fix diff for 971655528404953bf863ab65583dd4b7ab6e0148.

from __future__ import annotations

import logging
from collections import namedtuple
from collections.abc import Sequence
from dataclasses import dataclass
from typing import TYPE_CHECKING, Self

from django.db import models
from django.db.models import Case, F, Func, Q, Subquery, Value, When
from django.db.models.signals import pre_save
from sentry_relay.exceptions import RelayError
from sentry_relay.processing import parse_release

from sentry.db.models.manager.base_query_set import BaseQuerySet
from sentry.exceptions import InvalidSearchQuery
from sentry.models.releases.release_project import ReleaseProject
from sentry.utils.numbers import validate_bigint

if TYPE_CHECKING:
    from sentry.models.release import Release  # noqa: F401

logger = logging.getLogger(__name__)


class SemverVersion(
    namedtuple("SemverVersion", "major minor patch revision prerelease_case prerelease")
):
    pass


@dataclass
class SemverFilter:
    operator: str
    version_parts: Sequence[int | str]
    package: str | Sequence[str] | None = None
    negated: bool = False


class ReleaseQuerySet(BaseQuerySet["Release"]):
    def annotate_prerelease_column(self):
        """
        Adds a `prerelease_case` column to the queryset which is used to properly sort
        by prerelease. We treat an empty (but not null) prerelease as higher than any
        other value.
        """
        return self.annotate(
            prerelease_case=Case(
                When(prerelease="", then=1), default=0, output_field=models.IntegerField()
            )
        )

    def filter_to_semver(self) -> Self:
        """
        Filters the queryset to only include semver compatible rows
        """
        return self.filter(major__isnull=False)

    def filter_by_semver_build(
        self,
        organization_id: int,
        operator: str,
        build: str,
        project_ids: Sequence[int] | None = None,
        negated: bool = False,
    ) -> Self:
        """
        Filters released by build. If the passed `build` is a numeric string, we'll filter on
        `build_number` and make use of the passed operator.
        If it is a non-numeric string, then we'll filter on `build_code` instead. We support a
        wildcard only at the end of this string, so that we can filter efficiently via the index.
        """
        qs = self.filter(organization_id=organization_id)
        query_func = "exclude" if negated else "filter"

        if project_ids:
            qs = qs.filter(
                id__in=ReleaseProject.objects.filter(project_id__in=project_ids).values_list(
                    "release_id", flat=True
                )
            )

        if build.isdecimal() and validate_bigint(int(build)):
            qs = getattr(qs, query_func)(**{f"build_number__{operator}": int(build)})
        else:
            if not build or build.endswith("*"):
                qs = getattr(qs, query_func)(build_code__startswith=build[:-1])
            else:
                qs = getattr(qs, query_func)(build_code=build)

        return qs

    def filter_by_semver(
        self,
        organization_id: int,
        semver_filter: SemverFilter,
        project_ids: Sequence[int] | None = None,