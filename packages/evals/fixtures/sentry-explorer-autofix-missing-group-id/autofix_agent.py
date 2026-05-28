# Source excerpt from getsentry/sentry src/sentry/seer/autofix/autofix_agent.py@bf9c244d0341de6ad77ed57e7b1479a1320f9871.
# Unrelated context omitted; captured around the fix diff for c9772d7047ef78d03dbedcb87a1214a9af30ef07.

    }
    return step_to_action_type[step][is_completed]


def trigger_autofix_explorer(
    group: Group,
    step: AutofixStep,
    run_id: int | None = None,
    stopping_point: AutofixStoppingPoint | None = None,
    intelligence_level: Literal["low", "medium", "high"] = "low",
) -> int:
    """
    Start or continue an Explorer-based autofix run.

    Args:
        group: The Sentry group (issue) to analyze
        step: Which autofix step to run
        run_id: Existing run ID to continue, or None for new run
        stopping_point: Where to stop the automated pipeline (only used for new runs)

    Returns:
        The run ID
    """
    from sentry.seer.autofix.on_completion_hook import (
        AutofixOnCompletionHook,  # nested to avoid circular import
    )

    config = STEP_CONFIGS[step]
    client = SeerExplorerClient(
        organization=group.organization,
        project=group.project,
        user=None,  # No user personalization for autofix
        category_key="autofix",
        category_value=str(group.id),
        intelligence_level=intelligence_level,
        on_completion_hook=AutofixOnCompletionHook,
        enable_coding=config.enable_coding,
    )

    prompt = build_step_prompt(step, group)
    prompt_metadata = {"step": step.value}
    artifact_key = step.value if config.artifact_schema else None
    artifact_schema = config.artifact_schema

    if run_id is None:
        metadata = None
        if stopping_point:
            metadata = {"stopping_point": stopping_point.value, "group_id": group.id}
        run_id = client.start_run(
            prompt=prompt,
            prompt_metadata=prompt_metadata,
            artifact_key=artifact_key,
            artifact_schema=artifact_schema,
            metadata=metadata,
        )
    else:
        client.continue_run(
            run_id=run_id,
            prompt=prompt,
            prompt_metadata=prompt_metadata,
            artifact_key=artifact_key,
            artifact_schema=artifact_schema,
        )

    group.update(seer_autofix_last_triggered=timezone.now())

    payload = {
        "run_id": run_id,
        "group_id": group.id,
    }

    webhook_action_type = get_step_webhook_action_type(step, is_completed=False)
    event_name = webhook_action_type.value

    event_type = f"seer.{event_name}"
    try:
        sentry_app_event_type = SentryAppEventType(event_type)
        if SeerOperator.has_access(organization=group.organization):
            process_autofix_updates.apply_async(
                kwargs={
                    "event_type": sentry_app_event_type,
                    "event_payload": payload,
                    "organization_id": group.organization.id,
                }
            )
    except ValueError:
        logger.exception(
            "autofix.trigger.webhook_invalid_event_type",
            extra={"event_type": event_type},
        )

    # Send "started" webhook after we have the run_id
    try: