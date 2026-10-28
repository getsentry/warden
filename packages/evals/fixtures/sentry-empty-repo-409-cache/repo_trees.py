# Source excerpt from getsentry/sentry src/sentry/integrations/source_code_management/repo_trees.py@8e974682bd2f71ae62cf197ac32ccc1a74ae588b.
# Unrelated context omitted; captured around the fix diff for b53670419ece85ff5a06ef0f3fc21e71579599ba.

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Any, NamedTuple

from sentry.integrations.services.integration import RpcOrganizationIntegration
from sentry.issues.auto_source_code_config.utils.platform import get_supported_extensions
from sentry.shared_integrations.exceptions import ApiError, IntegrationError
from sentry.utils import metrics
from sentry.utils.cache import cache

logger = logging.getLogger(__name__)

METRICS_KEY_PREFIX = "integrations.source_code_management"
EXCLUDED_EXTENSIONS = ["spec.jsx"]
EXCLUDED_PATHS = ["tests/"]


class RepoAndBranch(NamedTuple):
    name: str
    branch: str


class RepoTree(NamedTuple):
    repo: RepoAndBranch
    files: Sequence[str]

# ... source context omitted ...

        shifted_seconds: int,
        only_source_code_files: bool = True,
        only_use_cache: bool = False,
    ) -> list[str]:
        """It returns all files for a repo or just source code files.

        repo_full_name: e.g. getsentry/sentry
        tree_sha: A branch or a commit sha
        only_source_code_files: Include all files or just the source code files
        only_use_cache: Do not hit the network but use the value from the cache
            if any. This is useful if the remaining API requests are low
        """
        key = f"{self.integration_name}:repo:{repo_full_name}:{'source-code' if only_source_code_files else 'all'}"
        cache_hit = cache.has_key(key)
        use_api = not cache_hit and not only_use_cache
        repo_files: list[str] = cache.get(key, [])
        if use_api:
            # Cache miss – fetch from API
            tree = self.get_client().get_tree(repo_full_name, tree_sha)
            if tree:
                # Keep files; discard directories
                repo_files = [node["path"] for node in tree if node["type"] == "blob"]
                if only_source_code_files:
                    repo_files = filter_source_code_files(files=repo_files)
                # The backend's caching will skip silently if the object size greater than 5MB
                # (due to Memcached's max value size limit).
                # The trees API does not return structures larger than 7MB
                # As an example, all file paths in Sentry is about 1.3MB
                # Larger customers may have larger repositories, however,
                # the cost of not having the files cached
                # repositories is a single API network request, thus,
                # being acceptable to sometimes not having everything cached
                cache.set(key, repo_files, self.CACHE_SECONDS + shifted_seconds)

            metrics.incr(
                f"{METRICS_KEY_PREFIX}.get_tree",
                tags={"fetched": tree is not None, "integration": self.integration_name},