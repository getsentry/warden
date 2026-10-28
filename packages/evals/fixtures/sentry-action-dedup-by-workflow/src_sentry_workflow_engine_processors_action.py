# Source excerpt from getsentry/sentry src/sentry/workflow_engine/processors/action.py@1730e13b97865d3ee8943c6f860964388c4987a8.
# Unrelated status and task dispatch code omitted; captured around fix 165be911ba388d402993b58f34dc8ad683827e32.

from collections import defaultdict


def get_unique_active_actions(actions_queryset, group):
    """
    Returns a queryset of unique active actions based on their handler's dedup_key method.
    Group is used for logging only.
    """
    dedup_key_to_action_id: dict[str, int] = {}
    dropped = defaultdict[str, set[int]](set)

    for action in actions_queryset:
        # We only want to fire active actions
        if action.status != ObjectStatus.ACTIVE:
            continue

        # workflow_id is annotated in the queryset
        workflow_id = getattr(action, "workflow_id")
        dedup_key = action.get_dedup_key(workflow_id)
        previous_action_id = dedup_key_to_action_id.get(dedup_key)
        if previous_action_id is not None:
            dropped[dedup_key].add(previous_action_id)
        dedup_key_to_action_id[dedup_key] = action.id

    for dedup_key, action_ids in dropped.items():
        group_type = group.issue_type.slug
        logger.info(
            "workflow_engine.action.dedup.dropped",
            extra={
                "dedup_key": dedup_key,
                "dropped_action_ids": sorted(action_ids),
                "replacement_action_id": dedup_key_to_action_id[dedup_key],
                "group_id": group.id,
                "group_type": group_type,
            },
        )
        metrics.incr(
            "workflow_engine.action.dedup.dropped", len(action_ids), tags={"group_type": group_type}
        )

    return actions_queryset.filter(id__in=dedup_key_to_action_id.values())
