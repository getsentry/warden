# Source excerpt from getsentry/sentry src/sentry/workflow_engine/processors/action.py@afeb841d94167044f6b1223bb075880668c35139.
# Unrelated context omitted; captured around the fix diff for e91547d56a39183e2e1d16ec8846262a28abd421.

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


@scopedstats.timer()
def fire_actions(
    actions: BaseQuerySet[Action],
    event_data: WorkflowEventData,
    workflow_uuid_map: dict[int, str],
) -> None:
    deduped_actions = get_unique_active_actions(actions, event_data.group)

    for action in deduped_actions:
        task_params = build_trigger_action_task_params(action, event_data, workflow_uuid_map)
        trigger_action.apply_async(kwargs=task_params, headers={"sentry-propagate-traces": False})


def filter_recently_fired_workflow_actions(
    filtered_action_groups: set[DataConditionGroup], event_data: WorkflowEventData
) -> BaseQuerySet[Action]:
    """
    Returns actions associated with the provided DataConditionsGroups, excluding those that have been recently fired. Also updates associated WorkflowActionGroupStatus objects.
    """

    data_condition_group_actions = DataConditionGroupAction.objects.filter(
        condition_group__in=filtered_action_groups
    ).values_list("action_id", "condition_group__workflowdataconditiongroup__workflow_id")

    action_to_workflows_ids: dict[int, set[int]] = defaultdict(set)
    workflow_ids: set[int] = set()

    for action_id, workflow_id in data_condition_group_actions:
        action_to_workflows_ids[action_id].add(workflow_id)
        workflow_ids.add(workflow_id)

    workflows = Workflow.objects.filter(id__in=workflow_ids)

    action_to_statuses = get_workflow_action_group_statuses(
        action_to_workflows_ids=action_to_workflows_ids,
        group=event_data.group,
        workflow_ids=workflow_ids,
    )
    now = timezone.now()
    action_to_workflows_ids, statuses_to_update, missing_statuses = (
        process_workflow_action_group_statuses(
            action_to_workflows_ids=action_to_workflows_ids,
            action_to_statuses=action_to_statuses,
            workflows=workflows,
            group=event_data.group,
            now=now,
        )
    )
    update_result = update_workflow_action_group_statuses(now, statuses_to_update, missing_statuses)

    # if statuses were not created for some reason, we should not fire for them
    for workflow_id, action_id in update_result.not_created:
        action_to_workflows_ids[action_id].remove(workflow_id)
        if not action_to_workflows_ids[action_id]:
            action_to_workflows_ids.pop(action_id)

    actions_queryset = Action.objects.filter(id__in=list(action_to_workflows_ids.keys()))

    # annotate actions with workflow_id they are firing for (deduped)
    workflow_id_cases = [
        When(
            id=action_id, then=Value(min(list(workflow_ids)))
        )  # select 1 workflow to fire for, this is arbitrary but deterministic
        for action_id, workflow_ids in action_to_workflows_ids.items()
    ]

    return actions_queryset.annotate(
        workflow_id=Case(*workflow_id_cases, output_field=models.IntegerField()),
    )


def get_available_action_integrations_for_org(organization: Organization) -> list[RpcIntegration]:
    providers = [
        handler.provider_slug
        for handler in action_handler_registry.registrations.values()