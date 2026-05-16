from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response


class GroupSearchViewVisibility:
    PRIVATE = "private"
    ORGANIZATION = "organization"


class GroupSearchView:
    objects = None


class GroupSearchViewLastVisited:
    objects = None


class GroupSearchViewPermission:
    def has_object_permission(self, request, view, obj):
        if obj.visibility == GroupSearchViewVisibility.ORGANIZATION:
            return True
        return obj.user_id == request.user.id


class OrganizationGroupSearchViewVisitEndpoint:
    permission_classes = (GroupSearchViewPermission,)

    def post(self, request, organization, view_id):
        view = GroupSearchView.objects.get(id=view_id, organization=organization)

        GroupSearchViewLastVisited.objects.update_or_create(
            organization=organization,
            user_id=request.user.id,
            group_search_view=view,
            defaults={"last_visited": timezone.now()},
        )

        return Response(status=status.HTTP_204_NO_CONTENT)
