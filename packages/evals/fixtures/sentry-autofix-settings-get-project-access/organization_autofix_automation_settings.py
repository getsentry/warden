from django.db.models import Q
from rest_framework.response import Response


class Project:
    objects = None


class OrganizationEndpoint:
    def get_projects(self, request, organization, project_ids=None):
        return request.access.get_projects(organization, project_ids=project_ids)

    def paginate(self, request, queryset, order_by, on_results, paginator_cls=None):
        return Response(on_results(list(queryset)))


class OrganizationAutofixAutomationSettingsEndpoint(OrganizationEndpoint):
    def _serialize_projects_with_settings(self, projects, organization):
        return [
            {
                "projectId": project.id,
                "automationHandoff": project.get_option("sentry:autofix_handoff"),
                "reposCount": len(project.repositories),
            }
            for project in projects
        ]

    def get(self, request, organization):
        query = request.GET.get("query")

        queryset = Project.objects.filter(organization_id=organization.id)
        if query:
            queryset = queryset.filter(Q(name__icontains=query) | Q(slug__icontains=query))

        return self.paginate(
            request=request,
            queryset=queryset,
            order_by="slug",
            on_results=lambda projects: self._serialize_projects_with_settings(
                projects, organization
            ),
        )

    def post(self, request, organization):
        project_ids = set(request.data["projectIds"])
        projects = self.get_projects(request, organization, project_ids=project_ids)
        return Response({"updated": [project.id for project in projects]}, status=204)
