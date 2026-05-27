import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).with_name("quick_validate.py")
SPEC = importlib.util.spec_from_file_location("quick_validate", SCRIPT_PATH)
assert SPEC is not None
quick_validate = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(quick_validate)


class QuickValidateTest(unittest.TestCase):
    def test_ignores_markdown_content_and_supporting_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "example-skill"
            skill_path.mkdir()
            (skill_path / "SKILL.md").write_text(
                """---
name: example-skill
description: I can review <example> content.
---

This intentionally references missing content that review may care about:

- references/missing.md
- scripts/missing.py
- SOURCES.md

/Users/example/private/path should not be script-validated.
""",
                encoding="utf-8",
            )
            (skill_path / "SPEC.md").write_text(
                """# Example Skill Spec

## Evaluation

Run the local checks for this skill.
""",
                encoding="utf-8",
            )

            valid, errors, warnings, _skill_class = quick_validate.validate_skill(
                skill_path,
                selected_skill_class="integration-documentation",
                strict_depth=True,
            )

        self.assertTrue(valid)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_rejects_invalid_frontmatter_yaml(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "example-skill"
            skill_path.mkdir()
            (skill_path / "SKILL.md").write_text(
                """---
name: [example-skill
description: Use when reviewing example code.
---

Review example code.
""",
                encoding="utf-8",
            )

            valid, errors, warnings, _skill_class = quick_validate.validate_skill(skill_path)

        self.assertFalse(valid)
        self.assertEqual(warnings, [])
        self.assertTrue(any("Invalid YAML in frontmatter" in message for message in errors), errors)


if __name__ == "__main__":
    unittest.main()
