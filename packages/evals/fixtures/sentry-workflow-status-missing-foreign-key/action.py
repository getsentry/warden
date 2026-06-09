# Source excerpt from getsentry/sentry src/sentry/workflow_engine/processors/action.py@e36f46a85cf4a6c9a6ae0e5e545a7c13b789d478.
# Unrelated context omitted; captured around the fix diff for f4cc09c52e73c2ab60a3b14291c60dd0db5458a7.

from collections import defaultdict
from datetime import datetime, timedelta

from django.db import connection, models
from django.db.models import Case, Value, When
from django.utils import timezone

from sentry import features
from sentry.constants import ObjectStatus
from sentry.db.models.manager.base_query_set import BaseQuerySet
from sentry.exceptions import NotRegistered
from sentry.integrations.base import IntegrationFeatures
from sentry.integrations.manager import default_manager as integrations_manager
from sentry.integrations.services.integration import RpcIntegration, integration_service
from sentry.integrations.types import IntegrationProviderSlug
from sentry.models.group import Group
from sentry.models.organization import Organization
from sentry.models.project import Project
from sentry.plugins.base import plugins
from sentry.plugins.bases.notify import NotificationPlugin
from sentry.rules.actions.services import PluginService
from sentry.utils import metrics
from sentry.workflow_engine.models import (
    Action,
    DataCondition,
    DataConditionGroup,
    DataConditionGroupAction,
    Workflow,
    WorkflowActionGroupStatus,
)
from sentry.workflow_engine.registry import action_handler_registry
from sentry.workflow_engine.tasks.actions import build_trigger_action_task_params, trigger_action
from sentry.workflow_engine.types import WorkflowEventData
from sentry.workflow_engine.utils import log_context, scopedstats

logger = log_context.get_logger(__name__)

EnqueuedAction = tuple[DataConditionGroup, list[DataCondition]]
UpdatedStatuses = int
CreatedStatuses = int
ConflictedStatuses = list[tuple[int, int]]  # (workflow_id, action_id)


def get_workflow_action_group_statuses(
    action_to_workflows_ids: dict[int, set[int]], group: Group, workflow_ids: set[int]
) -> dict[int, list[WorkflowActionGroupStatus]]:
    """
    Returns a mapping of action IDs to their corresponding WorkflowActionGroupStatus objects
    given the provided action_to_workflows_ids and group.
    """

    all_statuses = WorkflowActionGroupStatus.objects.filter(
        group=group, action_id__in=action_to_workflows_ids.keys(), workflow_id__in=workflow_ids
    )

    actions_with_statuses: dict[int, list[WorkflowActionGroupStatus]] = defaultdict(list)

    for status in all_statuses:
        workflow_id = status.workflow_id

# ... source context omitted ...


    missing_statuses: list[WorkflowActionGroupStatus] = []
    for action_id, expected_workflows in action_to_workflows_ids.items():
        wags = action_to_statuses.get(action_id, [])
        actual_workflows = {status.workflow_id for status in wags}
        missing_workflows = expected_workflows - actual_workflows

        for workflow_id in missing_workflows:
            # create a new status for the missing workflow
            missing_statuses.append(
                WorkflowActionGroupStatus(
                    workflow_id=workflow_id, action_id=action_id, group=group, date_updated=now
                )
            )
            updated_action_to_workflows_ids[action_id].add(workflow_id)

    return updated_action_to_workflows_ids, statuses_to_update, missing_statuses


def update_workflow_action_group_statuses(
    now: datetime, statuses_to_update: set[int], missing_statuses: list[WorkflowActionGroupStatus]
) -> tuple[UpdatedStatuses, CreatedStatuses, ConflictedStatuses]:
    updated_count = WorkflowActionGroupStatus.objects.filter(
        id__in=statuses_to_update, date_updated__lt=now
    ).update(date_updated=now)

    if not missing_statuses:
        return updated_count, 0, []

    # Use raw SQL: only returns successfully created rows
    # XXX: the query does not currently include batch size limit like bulk_create does
    with connection.cursor() as cursor:
        # Build values for batch insert
        values_placeholders = []
        values_data = []
        for s in missing_statuses:
            values_placeholders.append("(%s, %s, %s, %s, %s)")
            values_data.extend([s.workflow_id, s.action_id, s.group_id, now, now])

        sql = f"""
            INSERT INTO workflow_engine_workflowactiongroupstatus
            (workflow_id, action_id, group_id, date_added, date_updated)
            VALUES {", ".join(values_placeholders)}
            ON CONFLICT (workflow_id, action_id, group_id) DO NOTHING
            RETURNING workflow_id, action_id
        """

        cursor.execute(sql, values_data)
        created_rows = set(cursor.fetchall())  # Only returns newly inserted rows

    # Figure out which ones conflicted (weren't returned)
    conflicted_statuses = [
        (s.workflow_id, s.action_id)
        for s in missing_statuses
        if (s.workflow_id, s.action_id) not in created_rows
    ]

    # Log action_ids for debugging
    attempted_action_ids = {s.action_id for s in missing_statuses}
    created_action_ids = {action_id for _, action_id in created_rows}
    logger.debug(
        "workflow_action_group_status.creation",
        extra={
            "attempted_action_ids": list(attempted_action_ids),
            "created_action_ids": list(created_action_ids),
        },
    )

    created_count = len(created_rows)
    return updated_count, created_count, conflicted_statuses


def get_unique_active_actions(
    actions_queryset: BaseQuerySet[Action],  # decorated with the workflow_ids
    group: Group,
) -> BaseQuerySet[Action]:
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

# ... source context omitted ...


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
    _, _, conflicted_statuses = update_workflow_action_group_statuses(
        now, statuses_to_update, missing_statuses
    )

    # if statuses were not created for some reason, we should not fire for them
    for workflow_id, action_id in conflicted_statuses:
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
