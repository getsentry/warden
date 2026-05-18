from rest_framework.exceptions import ValidationError
from rest_framework.response import Response


class Detector:
    objects = None


class DetectorGroup:
    objects = None


class Group:
    objects = None


def get_open_periods_for_group(group, query_start, query_end):
    return group.open_periods.filter(start__gte=query_start, end__lte=query_end)


class OrganizationOpenPeriodsEndpoint:
    def get_group_from_detector_id(self, detector_id, organization):
        detector = (
            Detector.objects.with_type_filters()
            .select_related("project")
            .get(id=int(detector_id))
        )
        if detector.project.organization_id != organization.id:
            raise ValidationError({"detectorId": "Detector not found"})

        detector_group = DetectorGroup.objects.filter(detector=detector).first()
        return detector_group.group if detector_group else None

    def get_group_from_group_id(self, group_id, organization):
        group = Group.objects.select_related("project").get(id=int(group_id))
        if group.project.organization_id != organization.id:
            raise ValidationError({"groupId": "Group not found"})
        return group

    def get(self, request, organization):
        detector_id = request.GET.get("detectorId")
        group_id = request.GET.get("groupId")

        target_group = (
            self.get_group_from_detector_id(detector_id, organization)
            if detector_id
            else self.get_group_from_group_id(group_id, organization)
        )

        open_periods = get_open_periods_for_group(
            group=target_group,
            query_start=request.GET.get("start"),
            query_end=request.GET.get("end"),
        )
        return Response([period.id for period in open_periods])
