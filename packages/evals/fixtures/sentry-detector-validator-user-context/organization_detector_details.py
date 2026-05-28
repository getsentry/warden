# Source excerpt from getsentry/sentry src/sentry/workflow_engine/endpoints/organization_detector_details.py@93b7cee973b5da40d542b5f7d13c639752ee508b.
# Unrelated context omitted; captured around the fix diff for f19882e5a3f81e2d98a05af58c5faa1b406499c8.

    RESPONSE_NOT_FOUND,
    RESPONSE_UNAUTHORIZED,
)
from sentry.apidocs.examples.workflow_engine_examples import WorkflowEngineExamples
from sentry.apidocs.parameters import DetectorParams, GlobalParams
from sentry.db.postgres.transactions import in_test_hide_transaction_boundary
from sentry.incidents.grouptype import MetricIssue
from sentry.incidents.metric_issue_detector import schedule_update_project_config
from sentry.issues import grouptype
from sentry.models.organization import Organization
from sentry.models.project import Project
from sentry.utils.audit import create_audit_entry
from sentry.workflow_engine.endpoints.serializers.detector_serializer import DetectorSerializer
from sentry.workflow_engine.endpoints.utils.ids import to_valid_int_id
from sentry.workflow_engine.endpoints.validators.base import BaseDetectorTypeValidator
from sentry.workflow_engine.endpoints.validators.detector_workflow import (
    BulkDetectorWorkflowsValidator,
    can_delete_detector,
    can_edit_detector,
)
from sentry.workflow_engine.endpoints.validators.utils import get_unknown_detector_type_error
from sentry.workflow_engine.models import Detector


def get_detector_validator(
    request: Request,
    project: Project,
    detector_type_slug: str,
    instance: Detector | None = None,
    partial: bool = False,
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
        partial=partial,
    )


@region_silo_endpoint
@extend_schema(tags=["Monitors"])
class OrganizationDetectorDetailsEndpoint(OrganizationEndpoint):
    def convert_args(
        self, request: Request, detector_id: str, *args: Any, **kwargs: Any
    ) -> tuple[tuple[Any, ...], dict[str, Organization | Detector]]:
        args, kwargs = super().convert_args(request, *args, **kwargs)
        validated_detector_id = to_valid_int_id("detector_id", detector_id, raise_404=True)
        try:
            detector = (
                Detector.objects.with_type_filters()
                .select_related("project")
                .get(
                    id=validated_detector_id,
                    project__organization_id=kwargs["organization"].id,
                )
            )
            kwargs["detector"] = detector
        except Detector.DoesNotExist:
            raise ResourceDoesNotExist

        # Verify user has access to the detector's project (respects Open Membership setting)
        if not request.access.has_project_access(detector.project):
            raise PermissionDenied

        return args, kwargs

    publish_status = {
        "GET": ApiPublishStatus.PUBLIC,
        "PUT": ApiPublishStatus.PUBLIC,
        "DELETE": ApiPublishStatus.PUBLIC,
    }
    owner = ApiOwner.ALERTS_NOTIFICATIONS
    permission_classes = (OrganizationDetectorPermission,)

    @extend_schema(
        operation_id="Fetch a Monitor",
        parameters=[
            GlobalParams.ORG_ID_OR_SLUG,