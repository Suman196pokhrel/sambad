COMPOSE = docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: up down logs ps restart

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

restart:
	$(COMPOSE) down && $(COMPOSE) up -d