# Source excerpt from getsentry/sentry src/sentry/workflow_engine/models/action.py@1730e13b97865d3ee8943c6f860964388c4987a8.
# Unrelated class fields and trigger code omitted; captured around fix 165be911ba388d402993b58f34dc8ad683827e32.


class Action:
    type: str
    integration_id: int | None
    config: dict | None
    data: dict | None

    def get_dedup_key(self, workflow_id: int | None) -> str:
        key_parts = [self.type]
        if workflow_id is not None:
            key_parts.append(str(workflow_id))

        if self.integration_id:
            key_parts.append(str(self.integration_id))

        if self.config:
            config = self.config.copy()
            config.pop("target_display", None)
            key_parts.append(str(config))

        if self.data:
            data = self.data.copy()
            if "dynamic_form_fields" in data:
                data = data["dynamic_form_fields"]

            key_parts.append(str(data))

        return ":".join(key_parts)
