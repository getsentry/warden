# Source excerpt from getsentry/sentry src/sentry/models/release.py@0e64601cae2c42aed03cfd685511c982019307a0.
# Unrelated context omitted; captured around the fix diff for 971655528404953bf863ab65583dd4b7ab6e0148.

        # XXX(markus): Since the column is nullable we need to handle `null` here.
        # However `null | undefined` in request payloads means "don't change
        # status of release". This is why `from_string` does not consider
        # `null` valid.
        #
        # We could remove `0` as valid state and only have `null` but I think
        # that would make things worse.
        #
        # Eventually we should backfill releasestatus to 0
        if value is None or value == ReleaseStatus.OPEN:
            return "open"
        elif value == ReleaseStatus.ARCHIVED:
            return "archived"
        else:
            raise ValueError(repr(value))


def _get_cache_key(project_id: int, group_id: int, first: bool) -> str:
    return f"g-r:{group_id}-{project_id}-{first}"


class ReleaseModelManager(BaseManager["Release"]):
    def get_queryset(self) -> ReleaseQuerySet:
        return ReleaseQuerySet(self.model, using=self._db)

    def annotate_prerelease_column(self):
        return self.get_queryset().annotate_prerelease_column()

    def filter_to_semver(self) -> ReleaseQuerySet:
        return self.get_queryset().filter_to_semver()

    def filter_by_semver_build(
        self,
        organization_id: int,
        operator: str,
        build: str,
        project_ids: Sequence[int] | None = None,
        negated: bool = False,
    ) -> models.QuerySet:
        return self.get_queryset().filter_by_semver_build(
            organization_id,
            operator,
            build,
            project_ids,
            negated=negated,
        )

    def filter_by_semver(
        self,
        organization_id: int,
        semver_filter: SemverFilter,
        project_ids: Sequence[int] | None = None,
    ) -> models.QuerySet:

# ... source context omitted ...

                F("patch").desc(),
                F("revision").desc(),
                Case(When(prerelease="", then=1), default=0).desc(),
                F("prerelease").desc(),
                name="sentry_release_semver_by_package_idx",
            ),
            models.Index(
                "organization",
                F("major").desc(),
                F("minor").desc(),
                F("patch").desc(),
                F("revision").desc(),
                Case(When(prerelease="", then=1), default=0).desc(),
                F("prerelease").desc(),
                name="sentry_release_semver_idx",
            ),
            models.Index(fields=("organization", "build_code")),
            models.Index(fields=("organization", "build_number")),
            models.Index(fields=("organization", "date_added")),
            models.Index(fields=("organization", "status")),
        ]

    __repr__ = sane_repr("organization_id", "version")

    SEMVER_COLS = ["major", "minor", "patch", "revision", "prerelease_case", "prerelease"]

    def __eq__(self, other: object) -> bool:
        """Make sure that specialized releases are only comparable to the same
        other specialized release.  This for instance lets us treat them
        separately for serialization purposes.
        """
        return (
            # don't treat `NotImplemented` as truthy
            Model.__eq__(self, other) is True
            and isinstance(other, Release)
            and self._for_project_id == other._for_project_id
        )

    def __hash__(self):
        # https://code.djangoproject.com/ticket/30333
        return super().__hash__()

    @staticmethod
    def is_valid_version(value):
        if value is None:
            return False

        if any(c in value for c in BAD_RELEASE_CHARS):
            return False

        value_stripped = str(value).strip()