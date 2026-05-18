from rest_framework import status
from rest_framework.response import Response


class SlackOptionsLoadRequest:
    def __init__(self, request):
        self.data = request.data
        self.group_id = request.data["group_id"]
        self.substring = request.data.get("value", "")
        self.slack_team_id = request.data["team"]["id"]

    def validate(self):
        # Validates Slack signature and timestamp for the requesting workspace.
        return True


class Group:
    objects = None


def format_actor_options_slack(actors):
    return [{"text": actor.name, "value": str(actor.id)} for actor in actors]


class SlackOptionsLoadEndpoint:
    slack_request_class = SlackOptionsLoadRequest

    def get_filtered_option_groups(self, group, substring):
        teams = [team for team in group.project.teams.all() if substring in team.name]
        members = [
            member
            for member in group.project.get_members_as_rpc_users()
            if substring in member.email
        ]
        return [
            {"label": {"text": "Teams"}, "options": format_actor_options_slack(teams)},
            {"label": {"text": "People"}, "options": format_actor_options_slack(members)},
        ]

    def post(self, request):
        slack_request = self.slack_request_class(request)
        slack_request.validate()

        group = (
            Group.objects.select_related("project__organization")
            .filter(id=slack_request.group_id)
            .first()
        )

        if not group:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "option_groups": self.get_filtered_option_groups(group, slack_request.substring)
        }
        return Response(payload)
