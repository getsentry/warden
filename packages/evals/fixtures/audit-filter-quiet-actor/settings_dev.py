"""Local development overrides. Never imported in production."""

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# These are the AWS documentation example keys. They do not grant access to
# anything and exist so the local S3 emulator accepts requests.
DEV_S3_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
DEV_S3_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
DEV_S3_ENDPOINT = "http://localhost:9000"

AUDIT_LOG_RETENTION_DAYS = 365
