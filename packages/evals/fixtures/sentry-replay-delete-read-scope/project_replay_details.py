from rest_framework.response import Response


class ProjectPermission:
    scope_map = {
        "GET": ["project:read", "project:write", "project:admin"],
        "DELETE": ["project:write", "project:admin"],
    }


class ReplayDetailsPermission(ProjectPermission):
    scope_map = {
        "GET": ["project:read", "project:write", "project:admin"],
        "POST": ["project:write", "project:admin"],
        "PUT": ["project:write", "project:admin"],
        "DELETE": ["project:read", "project:write", "project:admin"],
    }


class delete_replay:
    @staticmethod
    def delay(**kwargs):
        return None


def has_archived_segment(project_id, replay_id):
    return False


class ProjectReplayDetailsEndpoint:
    permission_classes = (ReplayDetailsPermission,)

    def check_replay_access(self, request, project):
        # Read-side check: verifies replay feature availability and project visibility.
        if not request.access.has_project_scope(project, "project:read"):
            raise PermissionError

    def delete(self, request, project, replay_id):
        self.check_replay_access(request, project)

        if has_archived_segment(project.id, replay_id):
            return Response(status=404)

        delete_replay.delay(
            organization_id=project.organization.id,
            project_id=project.id,
            replay_id=replay_id,
        )

        return Response(status=204)
