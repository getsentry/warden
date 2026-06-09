# Source excerpt from getsentry/sentry src/sentry/tasks/autofix.py@4199c6aeed84c7c359aa7ad6863534174769d436.
# Unrelated context omitted; captured around the fix diff for 62125c6514958cd89aa3cf7374be32f984adb683.



@instrumented_task(
    name="sentry.tasks.autofix.generate_summary_and_run_automation",
    namespace=ingest_errors_tasks,
    processing_deadline_duration=35,
    retry=Retry(times=1),
)
def generate_summary_and_run_automation(group_id: int, **kwargs) -> None:
    from sentry.seer.autofix.issue_summary import get_issue_summary

    trigger_path = kwargs.get("trigger_path", "unknown")
    sentry_sdk.set_tag("trigger_path", trigger_path)

    group = Group.objects.get(id=group_id)
    organization = group.project.organization

    task_state = current_task()
    if task_state is None or task_state.attempt == 0:
        metrics.incr("sentry.tasks.autofix.generate_summary_and_run_automation", sample_rate=1.0)
        analytics.record(
            AiAutofixAutomationEvent(
                organization_id=organization.id,
                project_id=group.project_id,
                group_id=group.id,
                task_name="generate_summary_and_run_automation",
                issue_event_count=group.times_seen,
                fixability_score=group.seer_fixability_score,
            )
        )

    get_issue_summary(group=group, source=SeerAutomationSource.POST_PROCESS)


@instrumented_task(
    name="sentry.tasks.autofix.generate_issue_summary_only",
    namespace=ingest_errors_tasks,
    processing_deadline_duration=35,
    retry=Retry(times=3, delay=3, on=(Exception,)),
)
def generate_issue_summary_only(group_id: int) -> None:
    """
    Generate issue summary WITHOUT triggering automation.
    Used for triage signals flow when event count < 10 or when summary doesn't exist yet.
    """
    from sentry.api.serializers.rest_framework.base import (
        camel_to_snake_case,
        convert_dict_key_case,
    )
    from sentry.seer.autofix.issue_summary import (
        get_and_update_group_fixability_score,
        get_issue_summary,
    )

    group = Group.objects.get(id=group_id)
    organization = group.project.organization

    task_state = current_task()
    if task_state is None or task_state.attempt == 0:
        metrics.incr("sentry.tasks.autofix.generate_issue_summary_only", sample_rate=1.0)
        analytics.record(
            AiAutofixAutomationEvent(
                organization_id=organization.id,
                project_id=group.project_id,
                group_id=group.id,
                task_name="generate_issue_summary_only",
                issue_event_count=group.times_seen,
                fixability_score=group.seer_fixability_score,
            )
        )

    summary_data, status_code = get_issue_summary(
        group=group, source=SeerAutomationSource.POST_PROCESS, should_run_automation=False
    )

    summary_payload = None
    if status_code == 200:
        summary_snake = convert_dict_key_case(summary_data, camel_to_snake_case)
        required_fields = ["headline", "whats_wrong", "trace", "possible_cause"]
        if all(summary_snake.get(k) is not None for k in required_fields):
            summary_payload = {
                "group_id": group.id,
                **{k: summary_snake[k] for k in required_fields},
            }

    get_and_update_group_fixability_score(group, force_generate=True, summary=summary_payload)


@instrumented_task(
    name="sentry.tasks.autofix.run_automation_only_task",
    namespace=ingest_errors_tasks,
    processing_deadline_duration=35,
    retry=Retry(times=1),
)
def run_automation_only_task(group_id: int) -> None:
    """
    Run automation directly for a group (assumes summary and fixability already exist).
    Used for triage signals flow when event count >= 10 and summary exists.
    """
    from django.contrib.auth.models import AnonymousUser

    from sentry.seer.autofix.issue_summary import run_automation

    group = Group.objects.get(id=group_id)
    organization = group.project.organization

    task_state = current_task()
    if task_state is None or task_state.attempt == 0:
        metrics.incr("sentry.tasks.autofix.run_automation_only_task", sample_rate=1.0)
        analytics.record(
            AiAutofixAutomationEvent(
                organization_id=organization.id,
                project_id=group.project_id,
                group_id=group.id,
                task_name="run_automation_only",
                issue_event_count=group.times_seen,
                fixability_score=group.seer_fixability_score,
            )
        )

    event = group.get_latest_event()

    if not event:
        logger.warning("run_automation_only_task.no_event_found", extra={"group_id": group_id})
        return

    # Track issue age when running automation
    issue_age_days = int((timezone.now() - group.first_seen).total_seconds() / (60 * 60 * 24))
    metrics.distribution(
        "seer.automation.issue_age_since_first_seen", issue_age_days, unit="day", sample_rate=1.0
    )