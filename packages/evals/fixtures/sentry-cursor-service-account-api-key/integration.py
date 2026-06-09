# Source excerpt from getsentry/sentry src/sentry/integrations/cursor/integration.py@dd2e7671013b38550048c3c427b5152997e91ab9.
# Unrelated context omitted; captured around the fix diff for 652324b48217e89f4267bfc1bb6e5e390818c277.

from __future__ import annotations

import uuid
from collections.abc import Mapping, MutableMapping
from typing import Any, Literal

from django import forms
from django.http.request import HttpRequest
from django.http.response import HttpResponseBase
from django.utils.translation import gettext_lazy as _
from pydantic import BaseModel, ValidationError
from requests import HTTPError

from sentry.integrations.base import (
    FeatureDescription,
    IntegrationData,
    IntegrationFeatures,
    IntegrationMetadata,
)
from sentry.integrations.coding_agent.integration import (
    CodingAgentIntegration,
    CodingAgentIntegrationProvider,
)
from sentry.integrations.cursor.client import CursorAgentClient
from sentry.integrations.models.integration import Integration
from sentry.integrations.pipeline import IntegrationPipeline
from sentry.integrations.services.integration import integration_service
from sentry.integrations.services.integration.model import RpcIntegration
from sentry.models.apitoken import generate_token

# ... source context omitted ...

        [
            IntegrationFeatures.CODING_AGENT,
        ]
    )

    def get_pipeline_views(self):
        return [CursorPipelineView()]

    def build_integration(self, state: Mapping[str, Any]) -> IntegrationData:
        config = state.get("config", {})
        if not config:
            raise IntegrationConfigurationError("Missing configuration data")

        webhook_secret = generate_token()
        api_key = config["api_key"]

        try:
            client = CursorAgentClient(api_key=api_key, webhook_secret=webhook_secret)
            cursor_metadata = client.get_api_key_metadata()
            api_key_name = cursor_metadata.apiKeyName
            user_email = cursor_metadata.userEmail
        except (HTTPError, ApiError) as e:
            self.get_logger().exception("cursor.build_integration.metadata_fetch_failed")
            status_code: int | None = None
            if isinstance(e, ApiError):
                status_code = e.code
            elif isinstance(e, HTTPError) and e.response is not None:
                status_code = e.response.status_code
            if status_code in (401, 403):
                raise IntegrationConfigurationError(
                    "Invalid Cursor API key. Please verify that your API key is correct and has not been revoked."
                )
            raise IntegrationConfigurationError(
                "Unable to validate Cursor API key. Please try again or contact support if the issue persists."
            )
        except ValidationError:
            self.get_logger().exception("cursor.build_integration.metadata_validation_failed")
            raise IntegrationConfigurationError(
                "Received unexpected response from Cursor API. Please try again."
            )

        integration_name = (
            f"Cursor Cloud Agent - {user_email}/{api_key_name}"
            if user_email and api_key_name
            else "Cursor Cloud Agent"
        )

        metadata = CursorIntegrationMetadata(
            domain_name="cursor.sh",
            api_key=api_key,
            webhook_secret=webhook_secret,
            api_key_name=api_key_name,
            user_email=user_email,
        )

        return {
            # NOTE(jennmueng): We need to create a unique ID for each integration installation. Because of this, new installations will yield a unique external_id and integration.
            # Why UUIDs? We use UUIDs here for each integration installation because we don't know how many times this USER-LEVEL API key will be used, or if the same org can have multiple cursor agents (in the near future)
            # or if the same user can have multiple installations across multiple orgs. So just a UUID per installation is the best approach. Re-configuring an existing installation will still maintain this external id
            "external_id": uuid.uuid4().hex,
            "name": integration_name,
            "metadata": metadata.dict(),
        }

    def get_agent_name(self) -> str:
        return "Cursor Agent"

    def get_agent_key(self) -> str:
        return "cursor"

    @classmethod
    def get_installation(
        cls, model: RpcIntegration | Integration, organization_id: int, **kwargs: Any
    ) -> CursorAgentIntegration:
        return CursorAgentIntegration(model, organization_id)


class CursorAgentIntegration(CodingAgentIntegration):
    def get_organization_config(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "api_key",
                "type": "secret",
                "label": _("Cursor API Key"),
                "help": _("Update the API key used by Cursor Cloud Agents."),
                "required": True,
                "placeholder": "***********************",
                "formatMessageValue": False,
            }
        ]

    def update_organization_config(self, data: MutableMapping[str, Any]) -> None:
        api_key = data.get("api_key")
        if not api_key:
            raise IntegrationConfigurationError("API key is required")

        metadata = CursorIntegrationMetadata.parse_obj(self.model.metadata or {})

        try:
            client = CursorAgentClient(api_key=api_key, webhook_secret=metadata.webhook_secret)
            cursor_metadata = client.get_api_key_metadata()
            metadata.api_key = api_key
            metadata.api_key_name = cursor_metadata.apiKeyName
            metadata.user_email = cursor_metadata.userEmail
        except (HTTPError, ApiError) as e:
            status_code: int | None = None
            if isinstance(e, ApiError):
                status_code = e.code
            elif isinstance(e, HTTPError) and e.response is not None:
                status_code = e.response.status_code
            if status_code in (401, 403):
                raise IntegrationConfigurationError(
                    "Invalid Cursor API key. Please verify that your API key is correct and has not been revoked."
                )
            raise IntegrationConfigurationError(
                "Unable to validate Cursor API key. Please try again or contact support if the issue persists."
            )
        except ValidationError:
            raise IntegrationConfigurationError(
                "Received unexpected response from Cursor API. Please try again."
            )

        integration_name = (
            f"Cursor Cloud Agent - {metadata.user_email}/{metadata.api_key_name}"
            if metadata.user_email and metadata.api_key_name
            else "Cursor Cloud Agent"
        )

        integration_service.update_integration(
            integration_id=self.model.id, name=integration_name, metadata=metadata.dict()
        )
        self.model.metadata = metadata.dict()

        super().update_organization_config({})

    def get_client(self):
        return CursorAgentClient(
            api_key=self.api_key,
            webhook_secret=self.webhook_secret,
        )

    def get_dynamic_display_information(self) -> Mapping[str, Any] | None:
        """Return metadata to display in the configurations list."""
        metadata = CursorIntegrationMetadata.parse_obj(self.model.metadata or {})
