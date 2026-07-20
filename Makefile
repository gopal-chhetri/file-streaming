.PHONY: build up down migrate seed health test

build:
	docker compose -f deployments/local/compose.yml build

up:
	docker compose -f deployments/local/compose.yml up

down:
	docker compose -f deployments/local/compose.yml down

migrate:
	docker compose -f deployments/local/compose.yml run --rm backend npm run migrate:run

seed:
	docker compose -f deployments/local/compose.yml run --rm backend npm run seed:run

health:
	curl -sI http://localhost:3000/health

test:
	docker compose -f deployments/local/compose.yml run backend npm run test:e2e