.PHONY: build up down logs psql backend-shell migrate seed health test domains clean clean-uploads clean-db clean-kafka

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

# Wipe uploaded files, DB records, and Kafka queues
clean: clean-uploads clean-db clean-kafka

clean-uploads:
	@echo "Clearing MinIO buckets (raw-uploads, processed, thumbnails)..."
	docker compose -f $(COMPOSE_FILE) exec minio mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null
	docker compose -f $(COMPOSE_FILE) exec minio mc rm --recursive --force local/raw-uploads/ local/processed/ local/thumbnails/
	docker compose -f $(COMPOSE_FILE) exec minio mc mb --ignore-existing local/raw-uploads local/processed local/thumbnails

clean-db:
	@echo "Clearing video + watch history records from Postgres..."
	docker compose -f $(COMPOSE_FILE) exec -T postgres psql -U streaming -d streaming \
		-c "TRUNCATE TABLE watch_history, videos CASCADE;"

clean-kafka:
	@echo "Resetting Kafka topics (video.uploaded, video.heartbeat)..."
	docker compose -f $(COMPOSE_FILE) exec kafka kafka-topics --bootstrap-server localhost:9092 --delete --topic video.uploaded --if-exists || true
	docker compose -f $(COMPOSE_FILE) exec kafka kafka-topics --bootstrap-server localhost:9092 --delete --topic video.heartbeat --if-exists || true
	@sleep 2
	docker compose -f $(COMPOSE_FILE) exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic video.uploaded --partitions 1 --replication-factor 1 --if-not-exists || true
	docker compose -f $(COMPOSE_FILE) exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic video.heartbeat --partitions 1 --replication-factor 1 --if-not-exists || true
	@echo "Restarting consumers so they re-subscribe to the fresh topics..."
	docker compose -f $(COMPOSE_FILE) restart backend transcoding-worker || true
