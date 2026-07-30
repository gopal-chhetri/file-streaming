.PHONY: build up down logs psql backend-shell migrate seed health test domains

COMPOSE_FILE = deployments/local-dev/compose.yml
ENV_FILE = deployments/local-dev/.env
DOMAINS = streaming.soylab.local streamingapi.soylab.local streamingminio.soylab.local streamingredis.soylab.local streamingmongo.soylab.local streamingkafka.soylab.local

setup:
	@if [ ! -f $(ENV_FILE) ]; then \
		cp deployments/local-dev/.env.example $(ENV_FILE); \
		echo "Created $(ENV_FILE) from .env.example. Edit it with your secrets."; \
	else \
		echo "$(ENV_FILE) already exists."; \
		make build; \
	fi

build:
	docker compose -f $(COMPOSE_FILE) build

up:
	docker compose -f $(COMPOSE_FILE) up

down:
	docker compose -f $(COMPOSE_FILE) down

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

psql:
	docker exec -it streaming-postgres psql -U streaming -d streaming

backend-shell:
	docker exec -it streaming-backend /bin/sh

migrate:
	docker compose -f $(COMPOSE_FILE) run --rm backend pnpm run migration:up

seed:
	docker compose -f $(COMPOSE_FILE) run --rm backend pnpm run seed

health:
	curl -sI http://streamingapi.soylab.local/health

test:
	docker compose -f $(COMPOSE_FILE) run backend pnpm run test:e2e

domains:
	@if ! grep -q "soylab.local" /etc/hosts 2>/dev/null; then \
		echo "Adding *.soylab.local domains to /etc/hosts..."; \
		echo "127.0.0.1 $(DOMAINS)" | sudo tee -a /etc/hosts > /dev/null; \
		echo "Done."; \
	else \
		echo "*.soylab.local entries already exist in /etc/hosts."; \
	fi
