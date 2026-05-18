from rest_framework.response import Response


class PreprodArtifact:
    objects = None


def build_comparison_data(base_artifact, size_metrics):
    return [{"name": base_artifact.app_name, "delta": 128}]


def create_app_info_dict(artifact):
    return {"appId": artifact.app_id, "projectId": artifact.project_id}


class OrganizationPreprodPublicSizeAnalysisEndpoint:
    def get(self, request, organization, artifact_id):
        head_artifact = PreprodArtifact.objects.select_related("project").get(
            id=int(artifact_id),
            project__organization_id=organization.id,
        )
        response_data = {"buildId": str(head_artifact.id)}
        return self._build_completed_response(request, organization, head_artifact, response_data)

    def _build_completed_response(self, request, organization, head_artifact, response_data):
        size_metrics = head_artifact.get_size_metrics()
        base_artifact = self._get_base_artifact(request, organization, head_artifact)
        if base_artifact:
            response_data["baseBuildId"] = str(base_artifact.id)
            response_data["baseAppInfo"] = create_app_info_dict(base_artifact)
            response_data["comparisons"] = build_comparison_data(base_artifact, size_metrics)
        return Response(response_data)

    def _get_base_artifact(self, request, organization, head_artifact):
        base_artifact_id = request.GET.get("baseArtifactId")

        if base_artifact_id:
            return PreprodArtifact.objects.select_related("project").get(
                id=int(base_artifact_id),
                project__organization_id=organization.id,
            )

        return head_artifact.get_base_artifact_for_commit().first()
