# Source excerpt from getsentry/sentry src/sentry/users/api/endpoints/user_identity_config.py@0ab8c9c8b99e03e3493ebec1b1f28f196150dd8b.
# Unrelated context omitted; captured around the fix diff for fc6264aa4eba0b08b24402d68b70e14d1042e1cc.

        # Identity objects in order to correctly set the status.
        for identity in get_identities(user):
            if identity.category == category and identity.id == identity_int:
                return identity
        return None

    def get(self, request: Request, user: User, category: str, identity_id: str) -> Response:
        identity = self._get_identity(user, category, identity_id)
        if identity:
            return Response(serialize(identity, serializer=UserIdentityConfigSerializer()))
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def delete(self, request: Request, user: User, category: str, identity_id: str) -> Response:
        if category == GITHUB_COPILOT_IDENTITY:
            identity = self._get_identity(user, category, identity_id)
            if not identity:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if identity.status != Status.CAN_DISCONNECT:
                return Response(status=status.HTTP_403_FORBIDDEN)

            deleted = github_copilot_identity_service.delete(
                identity_id=int(identity_id), user_id=user.id
            )
            if not deleted:
                return Response(status=status.HTTP_404_NOT_FOUND)
            return Response(status=status.HTTP_204_NO_CONTENT)

        with transaction.atomic(using=router.db_for_write(Identity)):
            identity = self._get_identity(user, category, identity_id)
            if not identity:
                # Returns 404 even if the ID exists but belongs to
                # another user. In that case, 403 would also be
                # appropriate, but 404 is fine or even preferable.
                return Response(status=status.HTTP_404_NOT_FOUND)
            if identity.status != Status.CAN_DISCONNECT:
                return Response(status=status.HTTP_403_FORBIDDEN)

            model_type = identity.get_model_type_for_category()
            model_type.objects.get(id=int(identity_id)).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
