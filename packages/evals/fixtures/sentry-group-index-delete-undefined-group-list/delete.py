# Source excerpt from getsentry/sentry src/sentry/api/helpers/group_index/delete.py@ba133330286172f02ee83ba5441102a6a10ef218.
# Unrelated context omitted; captured around the fix diff for 4cab626b98ac3df88b0dd9c90161e43c806388b7.

            logger=audit_logger,
            organization_id=project.organization_id,
            target_object=group.id,
            event=audit_log.get_event_id("ISSUE_DELETE"),
            data={
                "issue_id": group.id,
                "project_slug": project.slug,
            },
        )

        issue_deleted.send_robust(
            group=group, user=request.user, delete_type=delete_type, sender=delete_group_list
        )


def schedule_tasks_to_delete_groups(
    request: Request,
    projects: Sequence[Project],
    organization_id: int,
    search_fn: SearchFunction | None = None,
) -> Response:
    """
    `search_fn` refers to the `search.query` method with the appropriate
    project, org, environment, and search params already bound
    """
    group_ids = request.GET.getlist("id")
    if group_ids:
        group_list = list(
            Group.objects.filter(
                project__in=projects,
                project__organization_id=organization_id,
                id__in=set(group_ids),
            ).exclude(status__in=[GroupStatus.PENDING_DELETION, GroupStatus.DELETION_IN_PROGRESS])
        )
    elif search_fn:
        try:
            cursor_result, _ = search_fn(
                {
                    "limit": BULK_MUTATION_LIMIT,
                    "paginator_options": {"max_limit": BULK_MUTATION_LIMIT},
                }
            )
        except ValidationError as exc:
            return Response({"detail": str(exc)}, status=400)

        group_list = list(cursor_result)

    if not group_list:
        return Response(status=204)

    groups_by_project_id = defaultdict(list)