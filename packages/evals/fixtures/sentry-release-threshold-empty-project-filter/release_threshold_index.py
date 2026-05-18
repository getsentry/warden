from django.db.models import Q
from rest_framework.response import Response


class ReleaseThreshold:
    objects = None


class OrganizationEndpoint:
    def get_environments(self, request, organization):
        return request.access.get_environments(organization)

    def get_projects(self, request, organization):
        # Returns only projects the current user may access. It returns an empty
        # list when the request has no matching project access.
        return request.access.get_projects(organization)

    def paginate(self, **kwargs):
        return Response([threshold.id for threshold in kwargs["queryset"]])


class ReleaseThresholdIndexEndpoint(OrganizationEndpoint):
    def get(self, request, organization):
        environments_list = self.get_environments(request, organization)
        projects_list = self.get_projects(request, organization)

        release_query = Q()
        if environments_list:
            release_query &= Q(environment__in=environments_list)
        if projects_list:
            release_query &= Q(project__in=projects_list)

        queryset = ReleaseThreshold.objects.filter(release_query)

        return self.paginate(
            request=request,
            queryset=queryset,
            order_by="date_added",
        )
