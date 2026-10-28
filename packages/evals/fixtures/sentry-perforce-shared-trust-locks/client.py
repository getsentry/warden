# Source excerpt from getsentry/sentry src/sentry/integrations/perforce/client.py@70ef2549cde90a8ff0ada2110239c7daed6883ad.
# Unrelated context omitted; captured around the fix diff for bc7c26f2fc40f2c9e6861ca7e6d0918fa73a6214.

from __future__ import annotations

import logging
from collections.abc import Generator, Sequence
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, TypedDict

from P4 import P4, P4Exception

from sentry.integrations.models.integration import Integration
from sentry.integrations.models.organization_integration import OrganizationIntegration
from sentry.integrations.services.integration import RpcIntegration, RpcOrganizationIntegration
from sentry.integrations.source_code_management.commit_context import (
    CommitContextClient,
    CommitInfo,
    FileBlameInfo,
    SourceLineInfo,
)
from sentry.integrations.source_code_management.repository import RepositoryClient
from sentry.models.pullrequest import PullRequest, PullRequestComment

# ... source context omitted ...

        if not org_integration:
            raise IntegrationError("Organization Integration is required for Perforce")

        metadata = integration.metadata
        self.p4port = metadata.get("p4port", "localhost:1666")
        self.user = metadata.get("user", "")
        self.password = metadata.get("password")
        self.auth_type = metadata.get(
            "auth_type", "password"
        )  # Default to password for backwards compat
        self.client_name = metadata.get("client")
        self.ssl_fingerprint = metadata.get("ssl_fingerprint")

    @contextmanager
    def _connect(self) -> Generator[P4]:
        """
        Context manager for P4 connections with automatic cleanup.

        Yields a connected P4 instance and ensures disconnection on exit.

        Uses P4Python API:
        - p4.connect(): https://www.perforce.com/manuals/p4python/Content/P4Python/python.programming.html#python.programming.connecting
        - p4.run_trust(): https://www.perforce.com/manuals/cmdref/Content/CmdRef/p4_trust.html
        - p4.run_login(): https://www.perforce.com/manuals/cmdref/Content/CmdRef/p4_login.html

        Example:
            with self._connect() as p4:
                result = p4.run("info")
        """
        p4 = P4()
        p4.port = self.p4port
        p4.user = self.user
        p4.password = self.password

        if self.client_name:
            p4.client = self.client_name

        p4.exception_level = 1  # Only errors raise exceptions

        # Connect to Perforce server
        try:
            p4.connect()
        except P4Exception as e:
            error_msg = str(e)
            # Provide helpful error message for connection failures
            if "SSL" in error_msg or "trust" in error_msg.lower():
                raise ApiError(
                    f"Failed to connect to Perforce (SSL issue): {error_msg}. "
                    f"Ensure ssl_fingerprint is correct. Obtain with: p4 -p {self.p4port} trust -y"
                )
            raise ApiError(f"Failed to connect to Perforce: {error_msg}")

        # Assert SSL trust after connection (if needed)
        # This must be done after p4.connect() but before p4.run_login()
        if self.ssl_fingerprint and self.p4port.startswith("ssl"):
            try:
                p4.run_trust("-i", self.ssl_fingerprint)
            except P4Exception as trust_error:
                try:
                    p4.disconnect()
                except Exception:
                    pass
                raise ApiError(
                    f"Failed to establish SSL trust: {trust_error}. "
                    f"Ensure ssl_fingerprint is correct. Obtain with: p4 -p {self.p4port} trust -y"
                )

        # Authenticate based on auth_type
        # - password: Requires run_login() to exchange password for session ticket
        # - ticket: Already authenticated via p4.password, no login needed
        if self.password and self.auth_type == "password":
            try:
                p4.run_login()
            except P4Exception as login_error:
                try:
                    p4.disconnect()
                except Exception:
                    pass
                raise ApiUnauthorized(
                    f"Failed to authenticate with Perforce: {login_error}. "
                    "Verify your password is correct."
                )
        elif self.password and self.auth_type == "ticket":
            # Ticket authentication: p4.password is already set to the ticket
            # Verify ticket works by running a test command
            try:
                p4.run("info")
            except P4Exception as e:
                try:
                    p4.disconnect()
                except Exception:
                    pass
                raise ApiUnauthorized(
                    f"Failed to authenticate with Perforce ticket: {e}. "
                    "Verify your P4 ticket is valid. Obtain a new ticket with: p4 login -p"
                )

        try:
            yield p4
        finally:
            # Ensure cleanup
            try:
                if p4.connected():
                    p4.disconnect()
            except Exception as e:
                # Log disconnect failures as they may indicate connection leaks
                logger.warning("Failed to disconnect from Perforce: %s", e, exc_info=True)

    def check_file(self, repo: Repository, path: str, version: str | None) -> object | None:
        """
        Check if a file exists in the depot.

        Uses p4 files command to list file(s) in the depot.
        API docs: https://www.perforce.com/manuals/cmdref/Content/CmdRef/p4_files.html

        Args:
            repo: Repository object containing depot path (includes stream if specified)
            path: File path relative to depot
            version: Not used (streams are part of depot_path)

        Returns:
            File info dict if exists, None otherwise
        """
        with self._connect() as p4:
            try: