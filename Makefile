.PHONY: build up down migrate seed

build:
	docker compose -f deployments/local/compose.yml build

up:
	docker compose -f deployments/local/compose.yml up -d

down:
	docker compose -f deployments/local/compose.yml down

migrate:
	docker compose -f deployments/local/compose.yml run --rm backend npm run migrate:run

seed:
	docker compose -f deployments/local/compose.yml run --rm backend npm run seed:run