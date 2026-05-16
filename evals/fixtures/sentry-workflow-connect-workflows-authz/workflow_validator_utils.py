from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied


class Detector:
    objects = None


class Workflow:
    objects = None


class DetectorWorkflow:
    objects = None


def can_edit_detector_workflow_connections(detector, request):
    return request.access.has_any_project_scope(detector.project, {"alerts:write", "org:write"})


def validate_detectors_exist_and_have_permissions(detector_ids, organization, request):
    detectors = Detector.objects.filter(project__organization=organization, id__in=detector_ids)
    if not all(can_edit_detector_workflow_connections(detector, request) for detector in detectors):
        raise PermissionDenied
    return detectors


def validate_workflows_exist(workflow_ids, organization):
    workflows = Workflow.objects.filter(organization=organization, id__in=workflow_ids)
    found_workflow_ids = set(workflows.values_list("id", flat=True))
    missing_workflow_ids = set(workflow_ids) - found_workflow_ids
    if missing_workflow_ids:
        raise serializers.ValidationError(f"Some workflows do not exist: {missing_workflow_ids}")
    return workflows


def connect_workflows_to_detectors(request, organization, workflow_id, detector_ids):
    validate_detectors_exist_and_have_permissions(detector_ids, organization, request)
    DetectorWorkflow.objects.bulk_create(
        DetectorWorkflow(workflow_id=workflow_id, detector_id=detector_id)
        for detector_id in detector_ids
    )


def connect_detectors_to_workflows(request, organization, detector_id, workflow_ids):
    validate_workflows_exist(workflow_ids, organization)
    DetectorWorkflow.objects.bulk_create(
        DetectorWorkflow(detector_id=detector_id, workflow_id=workflow_id)
        for workflow_id in workflow_ids
    )
