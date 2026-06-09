# Source excerpt from getsentry/sentry src/sentry/seer/autofix/issue_summary.py@4199c6aeed84c7c359aa7ad6863534174769d436.
# Unrelated context omitted; captured around the fix diff for 62125c6514958cd89aa3cf7374be32f984adb683.

    summary: dict[str, Any] | None = None,
) -> SummarizeIssueResponse:
    payload: dict[str, Any] = {
        "group_id": group.id,
        "organization_slug": group.organization.slug,
        "organization_id": group.organization.id,
        "project_id": group.project.id,
    }
    if summary is not None:
        payload["summary"] = summary
    response = make_signed_seer_api_request(
        fixability_connection_pool_gpu,
        "/v1/automation/summarize/fixability",
        body=orjson.dumps(payload, option=orjson.OPT_NON_STR_KEYS),
        timeout=settings.SEER_FIXABILITY_TIMEOUT,
    )
    if response.status >= 400:
        raise Exception(f"Seer API error: {response.status}")
    response_data = orjson.loads(response.data)
    return SummarizeIssueResponse.validate(response_data)


def get_and_update_group_fixability_score(
    group: Group,
    force_generate: bool = False,
    summary: dict[str, Any] | None = None,
) -> float:
    """
    Get the fixability score for a group and update the group with the score.
    If the fixability score is already set, return it without generating a new one.
    """
    if not force_generate and group.seer_fixability_score is not None:
        return group.seer_fixability_score

    with sentry_sdk.start_span(op="ai_summary.generate_fixability_score"):
        issue_summary = _generate_fixability_score(group, summary=summary)

    if not issue_summary.scores:
        raise ValueError("Issue summary scores is None or empty.")
    if issue_summary.scores.fixability_score is None:
        raise ValueError("Issue summary fixability score is None.")

    fixability_score = issue_summary.scores.fixability_score
    group.update(seer_fixability_score=fixability_score)
    return fixability_score


def _is_issue_fixable(group: Group, fixability_score: float) -> bool:
    project = group.project
    option = project.get_option("sentry:autofix_automation_tuning")
    if option == AutofixAutomationTuningSettings.OFF:
        return False
    elif option == AutofixAutomationTuningSettings.SUPER_LOW:
        return fixability_score >= FixabilityScoreThresholds.SUPER_HIGH.value
    elif option == AutofixAutomationTuningSettings.LOW:
        return fixability_score >= FixabilityScoreThresholds.HIGH.value
    elif option == AutofixAutomationTuningSettings.MEDIUM:
        return fixability_score >= FixabilityScoreThresholds.MEDIUM.value
    elif option == AutofixAutomationTuningSettings.HIGH:

# ... source context omitted ...

    cache_key: str,
    should_run_automation: bool = True,
) -> tuple[dict[str, Any], int]:
    """Core logic to generate and cache the issue summary."""
    serialized_event, event = _get_event(group, user, provided_event_id=force_event_id)

    if not serialized_event or not event:
        return {"detail": "Could not find an event for the issue"}, 400

    trace_tree = None
    if event:
        try:
            trace_tree = _get_trace_tree_for_event(event, group.project, timeout=3)
        except Exception:
            logger.warning(
                "Failed to get trace for event in issue summary",
                extra={"group_id": group.id},
                exc_info=True,
            )

    issue_summary = _call_seer(
        group,
        serialized_event,
        trace_tree,
    )

    if should_run_automation:
        try:
            run_automation(group, user, event, source)
        except Exception:
            logger.exception(
                "Error auto-triggering autofix from issue summary", extra={"group_id": group.id}
            )

    summary_dict = issue_summary.dict()
    summary_dict["event_id"] = event.event_id

    cache.set(cache_key, summary_dict, timeout=int(timedelta(days=7).total_seconds()))

    return summary_dict, 200


def _log_seer_scanner_billing_event(group: Group, source: SeerAutomationSource):
    if source == SeerAutomationSource.ISSUE_DETAILS:
        return

    quotas.backend.record_seer_run(
        group.organization.id, group.project.id, DataCategory.SEER_SCANNER
    )


def get_issue_summary_cache_key(group_id: int) -> str:
    return f"ai-group-summary-v2:{group_id}"


def get_issue_summary_lock_key(group_id: int) -> tuple[str, str]:
    return (f"ai-group-summary-v2-lock:{group_id}", "get_issue_summary")


def get_issue_summary(
    group: Group,
    user: User | RpcUser | AnonymousUser | None = None,
    force_event_id: str | None = None,
    source: SeerAutomationSource = SeerAutomationSource.ISSUE_DETAILS,