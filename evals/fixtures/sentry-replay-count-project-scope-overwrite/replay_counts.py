from dataclasses import replace


class Group:
    objects = None


class Dataset:
    IssuePlatform = "issue_platform"


def query_replays_count(project_ids, start, end, replay_ids, tenant_ids):
    return {"data": []}


def issue_platform_query(snuba_params, selected_columns, query, limit, offset, functions_acl, referrer):
    return {"data": [{"group_uniq_array_100_replay_id": ["abc123"], "issue.id": 42}]}


def get_replay_counts(snuba_params, query, data_source, return_ids):
    replay_ids_mapping = _get_replay_id_mappings(query, snuba_params, data_source)
    if not replay_ids_mapping:
        return {}

    replay_results = query_replays_count(
        project_ids=[p.id for p in snuba_params.projects],
        start=snuba_params.start,
        end=snuba_params.end,
        replay_ids=list(replay_ids_mapping.keys()),
        tenant_ids={"organization_id": snuba_params.organization.id},
    )
    return replay_results


def _get_select_column(query):
    return "issue.id", [42]


def _get_replay_id_mappings(query, snuba_params, data_source=Dataset.IssuePlatform):
    select_column, column_value = _get_select_column(query)

    if select_column == "issue.id":
        groups = Group.objects.select_related("project").filter(
            project__organization_id=snuba_params.organization.id,
            id__in=column_value,
        )
        snuba_params = replace(
            snuba_params,
            projects=[group.project for group in groups],
        )
        if not snuba_params.projects:
            return {}

    results = issue_platform_query(
        snuba_params=snuba_params,
        selected_columns=["group_uniq_array(100,replay.id)", select_column],
        query=query,
        limit=25,
        offset=0,
        functions_acl=["group_uniq_array"],
        referrer="api.organization-issue-replay-count",
    )

    return {
        replay_id: [row[select_column]]
        for row in results["data"]
        for replay_id in row["group_uniq_array_100_replay_id"]
    }
