# Source excerpt from getsentry/sentry src/sentry/grouping/ingest/seer.py@f45b1850b52758fb2f6a9dbbc80a77fbc69d8eaf.
# Unrelated context omitted; captured around the fix diff for 67e046ae53ae26ec2e69ad0002d44e6d5dbffcda.

        or killswitch_enabled(project.id, ReferrerOptions.INGEST, event)
        or _circuit_breaker_broken(event, project)
        # The rate limit check has to be last (see below) but rate-limiting aside, call this after other checks
        # because it calculates the stacktrace string, which we only want to spend the time to do if we already
        # know the other checks have passed.
        or _has_empty_stacktrace_string(event, variants)
        # do this after the empty stacktrace string check because it calculates the stacktrace string
        or _stacktrace_exceeds_limits(event, variants)
        # **Do not add any new checks after this.** The rate limit check MUST remain the last of all
        # the checks.
        #
        # (Checking the rate limit for calling Seer also increments the counter of how many times
        # we've tried to call it, and if we fail any of the other checks, it shouldn't count as an
        # attempt. Thus we only want to run the rate limit check if every other check has already
        # succeeded.)
        or _ratelimiting_enabled(event, project)
    ):
        return False

    return True


def _is_race_condition_skipped_event(event: Event, event_grouphash: GroupHash) -> bool:
    """
    In cases where multiple events with the same new hash are racing to assign that hash to a group,
    we only want one of them to be sent to Seer.

    We detect the race when creating `GroupHashMetadata` records, and track all but the winner of
    the race as events whose Seer call we should skip.
    """
    if event.should_skip_seer:
        logger.info(
            "should_call_seer_for_grouping.race_condition_skip",
            extra={
                "grouphash_id": event_grouphash.id,
                "grouphash_has_group": bool(event_grouphash.group_id),
                "hash": event_grouphash.hash,
                "event_id": event.event_id,
            },
        )
        record_did_call_seer_metric(event, call_made=False, blocker="race_condition")
        return True

    # TODO: Temporary debugging for the fact that we're still sometimes seeing multiple events per
    # hash being let through
    initial_has_group = bool(event_grouphash.group_id)  # Should in theory always be False
    if not initial_has_group:
        new_has_group: Any = None  # mypy appeasement
        try:
            event_grouphash.refresh_from_db()
            new_has_group = bool(event_grouphash.group_id)
        except Exception as e:
            new_has_group = repr(e)

    logger.info(
        "should_call_seer_for_grouping.race_condition_pass",
        extra={
            "grouphash_id": event_grouphash.id,
            "initial_grouphash_has_group": initial_has_group,
            "grouphash_has_group": new_has_group,
            "hash": event_grouphash.hash,
            "event_id": event.event_id,
        },
    )
    return False


def _event_content_is_seer_eligible(event: Event) -> bool:
    """
    Determine if an event's contents makes it fit for using with Seer's similar issues model.
    """
    platform = event.platform

    if not event_content_has_stacktrace(event):
        metrics.incr(
            "grouping.similarity.event_content_seer_eligible",
            sample_rate=options.get("seer.similarity.metrics_sample_rate"),
            tags={"platform": platform, "eligible": False, "blocker": "no-stacktrace"},
        )
        return False

    if event.platform in SEER_INELIGIBLE_EVENT_PLATFORMS:
        metrics.incr(
            "grouping.similarity.event_content_seer_eligible",
            sample_rate=options.get("seer.similarity.metrics_sample_rate"),
            tags={"platform": platform, "eligible": False, "blocker": "unsupported-platform"},
        )
        return False

    metrics.incr(
        "grouping.similarity.event_content_seer_eligible",
        sample_rate=options.get("seer.similarity.metrics_sample_rate"),
        tags={"platform": platform, "eligible": True, "blocker": "none"},