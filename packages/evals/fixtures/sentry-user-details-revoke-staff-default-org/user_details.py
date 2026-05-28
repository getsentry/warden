# Source excerpt from getsentry/sentry src/sentry/users/api/endpoints/user_details.py@b8493f599010a7da9f45466c2d875712ae0ba242.
# Unrelated context omitted; captured around the fix diff for 05b41c4744af7233561bb3046f7b0fa458ee5783.

                return Response(
                    {"detail": "Missing required permission to add superuser."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            elif not user.is_staff and request.data.get("isStaff"):
                return Response(
                    {"detail": "Missing required permission to add admin."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer_cls: type[BaseUserSerializer]
        if can_elevate_user:
            serializer_cls = PrivilegedUserSerializer
        # With superuser read/write separation, superuser read cannot hit this endpoint
        # so we can keep this as is_active_superuser. Once the feature flag is
        # removed and we only check is_active_staff, we can remove this comment.
        elif has_elevated_mode(request):
            # TODO(schew2381): Rename to staff serializer
            serializer_cls = SuperuserUserSerializer
        else:
            serializer_cls = UserSerializer
        serializer = serializer_cls(
            instance=user, data=request.data, partial=True, context={"request": request}
        )

        serializer_options = UserOptionsSerializer(
            data=request.data.get("options", {}), partial=True
        )

        # This serializer should NOT include privileged fields e.g. password
        if not serializer.is_valid() or not serializer_options.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # We want to do extra checks in SaaS mode for superuser/staff elevation.
        # The users have to also be a member of the default organization to be able to elevate
        # to superuser/staff.
        if settings.SENTRY_MODE == SentryMode.SAAS:
            validated_data = serializer.validated_data
            requested_superuser = validated_data.get("is_superuser")
            requested_staff = validated_data.get("is_staff")

            is_updating_superuser = requested_superuser is not None
            is_updating_staff = requested_staff is not None

            if is_updating_superuser or is_updating_staff:
                if not user_can_elevate(user):
                    return Response(
                        {
                            "detail": "User must be a member to the default organization to enable SuperUser mode."
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

        # map API keys to keys in model
        key_map = {
            "theme": "theme",
            "language": "language",
            "timezone": "timezone",
            "stacktraceOrder": "stacktrace_order",
            "defaultIssueEvent": "default_issue_event",
            "clock24Hours": "clock_24_hours",
            "prefersIssueDetailsStreamlinedUI": "prefers_issue_details_streamlined_ui",
        }

        options_result = serializer_options.validated_data

        for key in key_map:
            if key in options_result:
                UserOption.objects.set_value(
                    user=user, key=key_map.get(key, key), value=options_result.get(key)
                )

        with transaction.atomic(using=router.db_for_write(User)):
            user = serializer.save()

        return Response(serialize(user, request.user, DetailedSelfUserSerializer()))

    @sudo_required
    def delete(self, request: Request, user: User) -> Response:
        """
        Delete User Account

        Also removes organizations if they are an owner
        :pparam string user_id: user id
        :param boolean hard_delete: Completely remove the user from the database (requires super user)
        :param list organizations: List of organization ids to remove
        :auth required:
        """
        serializer = DeleteUserSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(status=status.HTTP_400_BAD_REQUEST)

        # from `frontend/remove_account.py`