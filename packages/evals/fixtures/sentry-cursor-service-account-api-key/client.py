# Source excerpt from getsentry/sentry src/sentry/integrations/cursor/client.py@dd2e7671013b38550048c3c427b5152997e91ab9.
# Unrelated context omitted; captured around the fix diff for 652324b48217e89f4267bfc1bb6e5e390818c277.

        message = error_json["error"]
        match = _MODEL_NAME_PATTERN.search(message)
    except (AttributeError, KeyError, TypeError) as e:
        logger.warning(
            "coding_agent.cursor.extract_model_from_error_failed", extra={"error": str(e)}
        )
        return None
    return match.group(1) if match else None


def _get_model_family(model_name: str) -> str:
    """Extract the alphabetic family prefix from a model name.

    Examples: 'gpt-4' -> 'gpt', 'claude-4.6-opus-high-thinking' -> 'claude'
    """
    match = _MODEL_FAMILY_PATTERN.match(model_name)
    return match.group(1).lower() if match else model_name.lower()


def _prioritize_models_by_family(models: list[str], failed_model: str | None) -> list[str]:
    """Reorder models so same-family models come first, then GPT models, then the rest."""
    if failed_model is None:
        return models
    family = _get_model_family(failed_model)
    same_family = [m for m in models if _get_model_family(m) == family]
    gpt_fallback = [
        m for m in models if _get_model_family(m) != family and _get_model_family(m) == "gpt"
    ]
    other = [m for m in models if _get_model_family(m) != family and _get_model_family(m) != "gpt"]
    return same_family + gpt_fallback + other


class CursorAgentClient(CodingAgentClient):
    integration_name = "cursor"
    base_url = "https://api.cursor.com"
    api_key: str

    def __init__(self, api_key: str, webhook_secret: str):
        super().__init__()
        self.api_key = api_key
        self.webhook_secret = webhook_secret

    def _get_auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    def get_api_key_metadata(self) -> CursorApiKeyMetadata:
        """Fetch metadata about the API key from Cursor's /v0/me endpoint."""
        logger.info(
            "coding_agent.cursor.get_api_key_metadata",
            extra={"agent_type": self.__class__.__name__},
        )

        api_response = self.get(
            "/v0/me",
            headers={
                "content-type": "application/json;charset=utf-8",
                **self._get_auth_headers(),
            },
            timeout=30,
        )

        return CursorApiKeyMetadata.validate(api_response.json)

    def get_available_models(self) -> list[str]:
        """Fetch available models from Cursor's /v0/models endpoint."""
        api_response = self.get(
            "/v0/models",
            headers={
                "content-type": "application/json;charset=utf-8",
                **self._get_auth_headers(),
            },
            timeout=30,
        )

        return CursorModelsResponse.validate(api_response.json).models

    def _post_launch(
        self,
        payload: CursorAgentLaunchRequestBody,
        request: CodingAgentLaunchRequest,
    ) -> CodingAgentState:
        """Post a launch request and parse the response into a CodingAgentState."""
        api_response = self.post(
            "/v0/agents",
            headers={
                "content-type": "application/json;charset=utf-8",
                **self._get_auth_headers(),
            },
            data=payload.dict(exclude_none=True),
            json=True,
            timeout=60,
        )

        launch_response = CursorAgentLaunchResponse.validate(api_response.json)

        return CodingAgentState(
            id=launch_response.id,
            status=CodingAgentStatus.RUNNING,
            provider=CodingAgentProviderType.CURSOR_BACKGROUND_AGENT,
            name=f"{request.repository.owner}/{request.repository.name}: {launch_response.name or f'Cursor Agent {launch_response.id}'}",
            started_at=launch_response.createdAt,
            agent_url=launch_response.target.url,
        )

    def launch(self, webhook_url: str, request: CodingAgentLaunchRequest) -> CodingAgentState:
        """Launch coding agent with webhook callback.
