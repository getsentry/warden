# Source excerpt from getsentry/sentry src/sentry/issues/endpoints/group_similar_issues_embeddings.py@1a9590be44235dfe22b52c3bf363df361ab273f6.
# Unrelated context omitted; captured around the fix diff for 4c02626bf661b631ca26883a2919d4f672a35666.

        self,
        similar_issues_data: Sequence[SeerSimilarIssueData],
        user: User | AnonymousUser,
        group: Group,
    ) -> Sequence[tuple[Mapping[str, Any], Mapping[str, Any]] | None]:
        """
        Format the responses using to be used by the frontend by changing the  field names and
        changing the cosine distances into cosine similarities.
        """
        group_data = {}
        parent_hashes = [
            similar_issue_data.parent_hash for similar_issue_data in similar_issues_data
        ]
        group_hashes = GroupHash.objects.filter(project_id=group.project_id, hash__in=parent_hashes)
        parent_hashes_group_ids = {
            group_hash.hash: group_hash.group_id for group_hash in group_hashes
        }
        for similar_issue_data in similar_issues_data:
            if parent_hashes_group_ids[similar_issue_data.parent_hash] != group.id:
                formatted_response: FormattedSimilarIssuesEmbeddingsData = {
                    "exception": round(1 - similar_issue_data.stacktrace_distance, 4),
                    "shouldBeGrouped": "Yes" if similar_issue_data.should_group else "No",
                }
                group_data[similar_issue_data.parent_group_id] = formatted_response

        serialized_groups = {
            int(g["id"]): g
            for g in serialize(
                list(Group.objects.get_many_from_cache(group_data.keys())), user=user
            )
        }

        return [(serialized_groups[group_id], group_data[group_id]) for group_id in group_data]

    @deprecated(
        CELL_API_DEPRECATION_DATE, url_names=["sentry-api-0-group-similar-issues-embeddings"]
    )