# Source excerpt from getsentry/sentry src/sentry/incidents/logic.py@9d76622623cec70718176b2f9a25112dbcd1a608.
# Unrelated context omitted; captured around the fix diff for b05248b86eeefc61a98f98412e120ecabfe61550.

    "transaction.duration",
]
TRANSLATABLE_COLUMNS = {
    "user": "tags[sentry:user]",
    "dist": "tags[sentry:dist]",
    "release": "tags[sentry:release]",
}
INSIGHTS_FUNCTION_VALID_ARGS_MAP = {
    "http_response_rate": ["3", "4", "5"],
    "performance_score": [
        "measurements.score.lcp",
        "measurements.score.fcp",
        "measurements.score.inp",
        "measurements.score.cls",
        "measurements.score.ttfb",
        "measurements.score.total",
    ],
}
EAP_COLUMNS = [
    "span.duration",
    "span.self_time",
    "ai.total_tokens.used",
    "ai.total_cost",
    "cache.item_size",
    "http.decoded_response_content_length",
    "http.response_content_length",
    "http.response_transfer_size",
]
EAP_FUNCTIONS = [
    "count",
    "count_unique",
    "avg",
    "p50",
    "p75",
    "p90",
    "p95",
    "p99",
    "p100",
    "max",
    "min",
    "sum",
    "epm",
    "failure_count",
    "failure_rate",
    "eps",
    "apdex",
]


def get_column_from_aggregate(
    aggregate: str, allow_mri: bool, allow_eap: bool = False
) -> str | None:
    # These functions exist as SnQLFunction definitions and are not supported in the older
    # logic for resolving functions. We parse these using `fields.is_function`, otherwise
    # they will fail using the old resolve_field logic.
    match = is_function(aggregate)
    if match and (
        match.group("function") in SPANS_METRICS_FUNCTIONS
        or match.group("function") in METRICS_LAYER_UNSUPPORTED_TRANSACTION_METRICS_FUNCTIONS
    ):
        return None if match.group("columns") == "" else match.group("columns")

    # Skip additional validation for EAP queries. They don't exist in the old logic.
    if match and match.group("function") in EAP_FUNCTIONS and allow_eap:
        return match.group("columns")

    if allow_mri:
        mri_column = _get_column_from_aggregate_with_mri(aggregate)
        # Only if the column was allowed, we return it, otherwise we fallback to the old logic.
        if mri_column:
            return mri_column

    function = resolve_field(aggregate)
    if function.aggregate is not None:
        return function.aggregate[1]

    return None


def _get_column_from_aggregate_with_mri(aggregate: str) -> str | None:
    match = is_function(aggregate)
    if match is None:
        return None

    function = match.group("function")
    columns = match.group("columns")

    parsed_mri = parse_mri(columns)
    if parsed_mri is None:
        return None
