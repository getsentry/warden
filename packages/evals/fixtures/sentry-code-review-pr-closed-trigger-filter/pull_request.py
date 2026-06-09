# Source excerpt from getsentry/sentry src/sentry/seer/code_review/webhooks/pull_request.py@1d0f212196da9d2c5e2c6bf66ff2e3f6e694e44a.
# Unrelated context omitted; captured around the fix diff for 722441c01309a9487d94bb84c740b6ae1b453735.

            github_event, action_value, WebhookFilteredReason.UNSUPPORTED_ACTION
        )
        return

    if action not in WHITELISTED_ACTIONS:
        logger.warning(Log.UNSUPPORTED_ACTION.value)
        record_webhook_filtered(
            github_event, action_value, WebhookFilteredReason.UNSUPPORTED_ACTION
        )
        return

    action_requires_trigger_permission = ACTIONS_REQUIRING_TRIGGER_CHECK.get(action)
    if action_requires_trigger_permission is not None and (
        org_code_review_settings is None
        or action_requires_trigger_permission not in org_code_review_settings.triggers
    ):
        record_webhook_filtered(github_event, action_value, WebhookFilteredReason.TRIGGER_DISABLED)
        return

    # Skip draft check for CLOSED actions to ensure Seer receives cleanup notifications
    # even if the PR was converted to draft before closing
    if action != PullRequestAction.CLOSED and pull_request.get("draft") is True:
        return

    pr_number = pull_request.get("number")
    if pr_number and action in ACTIONS_ELIGIBLE_FOR_EYES_REACTION:
        # We don't ever need to delete :eyes: since we later add it back to the PR description idempotently.
        reactions_to_delete = [GitHubReaction.HOORAY]
        if is_github_rate_limit_sensitive(organization.slug):
            reactions_to_delete = []

        delete_existing_reactions_and_add_reaction(
            github_event=github_event,
            github_event_action=action_value,
            integration=integration,
            organization_id=organization.id,
            repo=repo,