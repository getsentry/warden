# /// script
# requires-python = ">=3.12"
# dependencies = ["pyyaml"]
# ///
"""
Quick validation script for Agent Skills.

Validates only mechanical SKILL.md frontmatter and identity requirements.
Qualitative content, reference depth, routing, and prose structure belong to
human/agent review, not this script.

Usage:
    uv run quick_validate.py <skill_directory> [--skill-class <class>] [--strict-depth]

Returns exit code 0 on success, 1 on failure. Outputs JSON with validation results.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import yaml

MAX_NAME_LENGTH = 64
MAX_DESCRIPTION_LENGTH = 1024

SKILL_CLASSES = {
    "auto",
    "workflow-process",
    "integration-documentation",
    "security-review",
    "skill-authoring",
    "generic",
}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate agent skill frontmatter and identity fields.",
    )
    parser.add_argument("skill_directory")
    parser.add_argument("--skill-class", choices=sorted(SKILL_CLASSES), default="auto")
    parser.add_argument("--strict-depth", action="store_true")
    return parser.parse_args(argv)


def validate_skill(
    skill_path: Path,
    selected_skill_class: str = "auto",
    strict_depth: bool = False,
) -> tuple[bool, list[str], list[str], str]:
    """Validate a skill directory. Returns (valid, errors, warnings, resolved_skill_class)."""
    # Keep the flag for CLI compatibility; depth/content checks belong to review.
    _ = strict_depth
    errors: list[str] = []
    warnings: list[str] = []

    # Check SKILL.md exists.
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return False, ["SKILL.md not found"], [], "generic"

    content = skill_md.read_text()

    # Check frontmatter exists and is first.
    if not content.startswith("---"):
        errors.append("No YAML frontmatter found (file must start with ---)")
        return False, errors, warnings, "generic"

    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        errors.append("Invalid frontmatter format (missing closing ---)")
        return False, errors, warnings, "generic"

    # Parse frontmatter.
    frontmatter_text = match.group(1)
    try:
        frontmatter = yaml.safe_load(frontmatter_text)
        if not isinstance(frontmatter, dict):
            errors.append("Frontmatter must be a YAML mapping")
            return False, errors, warnings, "generic"
    except yaml.YAMLError as exc:
        errors.append(f"Invalid YAML in frontmatter: {exc}")
        return False, errors, warnings, "generic"

    # Validate frontmatter keys without hardcoding provider-specific optional fields.
    invalid_keys = [key for key in frontmatter.keys() if not isinstance(key, str) or not key.strip()]
    if invalid_keys:
        errors.append("Frontmatter keys must be non-empty strings")

    # Validate name.
    if "name" not in frontmatter:
        errors.append("Missing required field: name")
    else:
        name = frontmatter["name"]
        if not isinstance(name, str):
            errors.append(f"name must be a string, got {type(name).__name__}")
        else:
            name = name.strip()
            if not name:
                errors.append("name must not be empty")
            elif len(name) > MAX_NAME_LENGTH:
                errors.append(f"name is too long ({len(name)} chars, max {MAX_NAME_LENGTH})")
            elif not re.match(r"^[a-z0-9-]+$", name):
                errors.append(f"name '{name}' must contain only lowercase letters, digits, and hyphens")
            elif name.startswith("-") or name.endswith("-"):
                errors.append(f"name '{name}' must not start or end with a hyphen")
            elif "--" in name:
                errors.append(f"name '{name}' must not contain consecutive hyphens")
            elif name != skill_path.name:
                errors.append(f"name '{name}' does not match directory name '{skill_path.name}'")

    # Validate description.
    if "description" not in frontmatter:
        errors.append("Missing required field: description")
    else:
        description = frontmatter["description"]
        if not isinstance(description, str):
            errors.append(f"description must be a string, got {type(description).__name__}")
        else:
            description = description.strip()
            if not description:
                errors.append("description must not be empty")
            elif len(description) > MAX_DESCRIPTION_LENGTH:
                errors.append(f"description is too long ({len(description)} chars, max {MAX_DESCRIPTION_LENGTH})")

    resolved_skill_class = selected_skill_class if selected_skill_class != "auto" else "generic"

    return len(errors) == 0, errors, warnings, resolved_skill_class


def main() -> None:
    args = parse_args(sys.argv[1:])
    skill_path = Path(args.skill_directory).resolve()
    if not skill_path.is_dir():
        print(json.dumps({"valid": False, "errors": [f"Not a directory: {skill_path}"]}))
        sys.exit(1)

    valid, errors, warnings, resolved_skill_class = validate_skill(
        skill_path,
        selected_skill_class=args.skill_class,
        strict_depth=args.strict_depth,
    )
    result = {
        "valid": valid,
        "skill_class": resolved_skill_class,
        "strict_depth": args.strict_depth,
        "errors": errors,
        "warnings": warnings,
    }
    print(json.dumps(result, indent=2))
    sys.exit(0 if valid else 1)


if __name__ == "__main__":
    main()
