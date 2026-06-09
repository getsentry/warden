# Source excerpt from getsentry/sentry src/sentry/workflow_engine/endpoints/organization_detector_index.py@93b7cee973b5da40d542b5f7d13c639752ee508b.
# Unrelated context omitted; captured around the fix diff for f19882e5a3f81e2d98a05af58c5faa1b406499c8.

        else:
            assert_never(actor)
    return assignee_query


# Maps API field name to database ordering expressions
SORT_MAP = {
    "name": "name",
    "-name": "-name",
    "id": "id",
    "-id": "-id",
    "type": "type",
    "-type": "-type",
    "connectedWorkflows": "connected_workflows",
    "-connectedWorkflows": "-connected_workflows",
    "latestGroup": F("latest_group_date_added").asc(nulls_first=True),
    "-latestGroup": F("latest_group_date_added").desc(nulls_last=True),
    "openIssues": F("open_issues_count").asc(nulls_first=True),
    "-openIssues": F("open_issues_count").desc(nulls_last=True),
}

DETECTOR_TYPE_ALIASES = {
    "metric": MetricIssue.slug,
    "uptime": UptimeDomainCheckFailure.slug,
    "cron": MonitorIncidentType.slug,
}


def get_detector_validator(
    request: Request, project: Project, detector_type_slug: str, instance: Any = None
) -> BaseDetectorTypeValidator:
    type = grouptype.registry.get_by_slug(detector_type_slug)
    if type is None:
        error_message = get_unknown_detector_type_error(detector_type_slug, project.organization)
        raise ValidationError({"type": [error_message]})

    if type.detector_settings is None or type.detector_settings.validator is None:
        raise ValidationError({"type": ["Detector type not compatible with detectors"]})

    return type.detector_settings.validator(
        instance=instance,
        context={
            "project": project,
            "organization": project.organization,
            "request": request,
            "access": request.access,
        },
        data=request.data,
    )


@region_silo_endpoint
@extend_schema(tags=["Monitors"])
class OrganizationDetectorIndexEndpoint(OrganizationEndpoint):
    publish_status = {
        "GET": ApiPublishStatus.PUBLIC,
        "POST": ApiPublishStatus.PUBLIC,
        "PUT": ApiPublishStatus.PUBLIC,
        "DELETE": ApiPublishStatus.PUBLIC,
    }
    owner = ApiOwner.ISSUES

    permission_classes = (OrganizationDetectorPermission,)

    def filter_detectors(self, request: Request, organization: Any) -> QuerySet[Detector]:
        """
        Filter detectors based on the request parameters.
        """

        if not request.user.is_authenticated:
            return Detector.objects.none()

        if raw_idlist := request.GET.getlist("id"):
            ids = to_valid_int_id_list("id", raw_idlist)
            # If filtering by IDs, we must search across all accessible projects
            projects = self.get_projects(
                request,
                organization,
                include_all_accessible=True,
            )
            return Detector.objects.with_type_filters().filter(
                project_id__in=projects,
                id__in=ids,
            )

        projects = self.get_projects(
            request,
            organization,
        )

        queryset: QuerySet[Detector] = Detector.objects.with_type_filters().filter(