"""Private local env-file parsing is allowlisted and never shell-evaluated."""

import sys
import unittest
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "services/analysis/src"))
from waste2watt_analysis.external_config import (
    load_local_provider_environment,
    load_provider_credentials,
    parse_private_environment,
)


class ExternalConfigTests(unittest.TestCase):
    def test_loads_only_allowlisted_values_and_preserves_process_environment(self):
        environment = {
            "GEMINI_API_KEY": "already-configured-private-value",
            "GROQ_API_KEY": "",
        }
        lines = (
            "# comments are ignored",
            "GEMINI_API_KEY=ignored-file-value",
            'GROQ_API_KEY="new-private-value"',
            "OPENROUTER_API_KEY=$(do-not-evaluate)",
            "UNRELATED_SECRET=ignored",
        )
        loaded = parse_private_environment(lines, environment)
        self.assertEqual(loaded, ("GROQ_API_KEY", "OPENROUTER_API_KEY"))
        self.assertEqual(environment["GEMINI_API_KEY"], "already-configured-private-value")
        self.assertEqual(environment["GROQ_API_KEY"], "new-private-value")
        self.assertEqual(environment["OPENROUTER_API_KEY"], "$(do-not-evaluate)")
        self.assertNotIn("UNRELATED_SECRET", environment)

    def test_does_not_return_or_log_secret_values(self):
        environment = {}
        loaded = parse_private_environment(("GEMINI_API_KEY=do-not-print-this",), environment)
        self.assertEqual(loaded, ("GEMINI_API_KEY",))
        self.assertNotIn("do-not-print-this", repr(loaded))

    def test_loads_only_the_backend_local_env_file_and_returns_names(self):
        environment = {}
        file_content = StringIO(
            "GEMINI_API_KEY=mock-gemini\n"
            "GROQ_API_KEY=mock-groq\n"
            "OPENROUTER_API_KEY=mock-openrouter\n"
            "UNRELATED_SECRET=ignored\n"
        )
        opened_paths = []

        def open_file(path, *args, **kwargs):
            opened_paths.append(path)
            return file_content

        with patch.object(Path, "open", autospec=True, side_effect=open_file):
            loaded = load_local_provider_environment(environment)
        self.assertEqual(
            loaded,
            ("GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY"),
        )
        self.assertEqual(opened_paths[0].name, ".env.local")
        self.assertEqual(environment["GEMINI_API_KEY"], "mock-gemini")
        self.assertEqual(environment["GROQ_API_KEY"], "mock-groq")
        self.assertEqual(environment["OPENROUTER_API_KEY"], "mock-openrouter")
        self.assertNotIn("UNRELATED_SECRET", environment)
        self.assertNotIn("mock-gemini", repr(loaded))

    def test_never_reads_a_dotenv_file_in_lambda(self):
        environment = {"AWS_LAMBDA_FUNCTION_NAME": "test-analysis"}
        with patch.object(Path, "open", side_effect=AssertionError("must not read local file")):
            self.assertEqual(load_local_provider_environment(environment), ())

    def test_runtime_secret_loader_returns_only_provider_keys(self):
        class SecretsClient:
            def get_secret_value(self, **kwargs):
                self.secret_id = kwargs["SecretId"]
                return {
                    "SecretString": (
                        '{"GEMINI_API_KEY":"gemini-private",'
                        '"GROQ_API_KEY":" groq-private ",'
                        '"OPENROUTER_API_KEY":"router-private",'
                        '"UNRELATED_SECRET":"discard-me"}'
                    )
                }

        client = SecretsClient()
        result = load_provider_credentials(client, "arn:secret")
        self.assertEqual(client.secret_id, "arn:secret")
        self.assertEqual(
            result,
            {
                "GEMINI_API_KEY": "gemini-private",
                "GROQ_API_KEY": "groq-private",
                "OPENROUTER_API_KEY": "router-private",
            },
        )
        self.assertNotIn("UNRELATED_SECRET", result)

    def test_runtime_secret_loader_fails_closed_without_secret_or_on_read_error(self):
        class SecretsClient:
            calls = 0

            def get_secret_value(self, **_kwargs):
                self.calls += 1
                raise ClientError(
                    {"Error": {"Code": "AccessDeniedException", "Message": "private"}},
                    "GetSecretValue",
                )

        client = SecretsClient()
        self.assertEqual(load_provider_credentials(client, None), {})
        self.assertEqual(client.calls, 0)


if __name__ == "__main__":
    unittest.main()
