.PHONY: help build up down restart logs shell migrate createsuperuser seed test clean

# Default target
help:
	@echo "Available commands:"
	@echo "  build          - Build Docker images"
	@echo "  up             - Start development environment"
	@echo "  down           - Stop development environment"
	@echo "  restart        - Restart development environment"
	@echo "  logs           - Show container logs"
	@echo "  shell          - Open Django shell"
	@echo "  migrate        - Run database migrations"
	@echo "  createsuperuser - Create Django superuser"
	@echo "  seed           - Seed database with sample data"
	@echo "  test           - Run tests"
	@echo "  test-api       - Run API tests"
	@echo "  clean          - Clean up containers and volumes"

# Docker commands
build:
	docker-compose build

up:
	docker-compose up -d
	@echo "Development server running at http://localhost:8000"

down:
	docker-compose down

restart: down up

logs:
	docker-compose logs -f

# Django commands
shell:
	docker-compose exec web python manage.py shell

migrate:
	docker-compose exec web python manage.py migrate

createsuperuser:
	docker-compose exec web python manage.py createsuperuser

seed:
	docker-compose exec web python manage.py seed_data

test:
	docker-compose exec web python manage.py test

test-api:
	python test_api.py

# Cleanup
clean:
	docker-compose down -v
	docker system prune -f

# Production commands
prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f