.PHONY: docs docs-build test

docs:
	mkdocs serve

docs-build:
	mkdocs build --strict

test:
	pnpm test
