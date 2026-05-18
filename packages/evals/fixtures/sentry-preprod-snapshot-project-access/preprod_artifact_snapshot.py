from rest_framework.response import Response


class PreprodArtifact:
    objects = None


class PreprodSnapshotMetrics:
    class DoesNotExist(Exception):
        pass


def get_preprod_session(organization_id, project_id):
    return object()


def delete_artifacts_and_eap_data(artifacts):
    return None


class OrganizationReleasePermission:
    scope_map = {
        "GET": ["org:read", "org:write", "org:admin"],
        "DELETE": ["project:releases", "project:admin"],
    }


class OrganizationPreprodSnapshotEndpoint:
    permission_classes = (OrganizationReleasePermission,)

    def delete(self, request, organization, snapshot_id):
        artifact = PreprodArtifact.objects.select_related("project").get(
            id=snapshot_id,
            project__organization_id=organization.id,
        )

        try:
            artifact.preprodsnapshotmetrics
        except PreprodSnapshotMetrics.DoesNotExist:
            return Response({"detail": "Artifact is not a snapshot"}, status=400)

        delete_artifacts_and_eap_data([artifact])
        return Response(status=204)

    def get(self, request, organization, snapshot_id):
        artifact = PreprodArtifact.objects.select_related("project").get(
            id=snapshot_id,
            project__organization_id=organization.id,
        )
        snapshot_metrics = artifact.preprodsnapshotmetrics
        session = get_preprod_session(organization.id, artifact.project_id)
        manifest = session.get(snapshot_metrics.manifest_key)
        return Response({"projectId": artifact.project_id, "manifest": manifest})
