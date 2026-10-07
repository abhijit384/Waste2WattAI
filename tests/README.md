# Scaffold checks

TypeScript tests use Node 24's built-in test runner and native type stripping; no
additional test framework is needed. Python tests use standard-library unittest.
Tests verify the API's explicit 501 response and that Python placeholders cannot
fabricate successful analysis or decisions. These are boundary checks, not business
logic or end-to-end cloud tests. Python tests configure local source import paths.
