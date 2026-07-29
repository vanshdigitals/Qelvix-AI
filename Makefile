.DEFAULT_GOAL := help
.PHONY: help dev verify verify-full contract migrate seed test lint typecheck install

BACKEND := backend
FRONTEND := frontend

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install backend and frontend dependencies
	cd $(BACKEND) && pip install -r requirements-dev.txt
	cd $(FRONTEND) && npm ci

dev: ## Bring up Postgres, Redis, the API, and the frontend
	docker compose up -d postgres redis
	cd $(BACKEND) && uvicorn app.main:create_app --factory --reload --port 8000 & \
	cd $(FRONTEND) && npm run dev

lint: ## G1 — lint both stacks
	cd $(BACKEND) && ruff check app tests && ruff format --check app tests
	cd $(FRONTEND) && npm run lint && npm run format:check

typecheck: ## G1 — type-check both stacks
	cd $(BACKEND) && mypy app
	cd $(FRONTEND) && npm run typecheck

test: ## G2 — unit tests, both stacks
	cd $(BACKEND) && pytest
	cd $(FRONTEND) && npm run test

contract: ## G6 — export the OpenAPI snapshot and regenerate frontend types
	python scripts/export_openapi.py
	bash scripts/generate_types.sh

migrate: ## Apply Alembic migrations
	cd $(BACKEND) && alembic upgrade head

seed: ## Load local development seed data
	cd $(BACKEND) && python -m scripts.seed

verify: lint typecheck test ## Local gate: G1 + G2 + G6 + G7
	$(MAKE) contract
	git diff --exit-code -- docs/contracts/openapi.json $(FRONTEND)/lib/api/types.generated.ts
	cd $(BACKEND) && pip-audit -r requirements.txt
	cd $(FRONTEND) && npm audit --audit-level=high
	detect-secrets-hook --baseline .secrets.baseline $$(git ls-files)

verify-full: verify ## Full gate: adds G3 accessibility, G4 E2E, G5 performance budget
	cd $(FRONTEND) && npx playwright test
	npx --yes @lhci/cli@0.14.x autorun --config=lighthouserc.json
