# Makefile for FREQHOLE schema management

DB_NAME ?= electric
DB_USER ?= postgres
SCHEMA_DIR ?= schema
MIGRATE_BIN ?= electric
DUMP ?= db_backup.dump.sql
INIT_FILE ?= $(SCHEMA_DIR)/init.sql

# default target
.PHONY: help
help:
	@echo "Usage:"
	@echo "  make init          # Run all migrations in init.sql"
	@echo "  make seed          # Load seeds.sql data"
	@echo "  make compile       # Compile schema with ElectricSQL"
	@echo "  make rese          # Drop and recreate the database (dev only)"
	@echo "  make pgdump        # export the database to timestamped sql file"
	@echo "  make pgload        # load database from sql file (pg_restore)"
	@echo "  make new           # generate a new migration file"
	@echo "  make apply         # apply any new migrations"

.PHONY: init
init:
	psql -U $(DB_USER) -d $(DB_NAME) -f $(SCHEMA_DIR)/init.sql

.PHONY: seed
seed:
	psql -U $(DB_USER) -d $(DB_NAME) -f $(SCHEMA_DIR)/seeds.sql

.PHONY: compile
compile:
	$(MIGRATE_BIN) migrate compile $(SCHEMA_DIR)

.PHONY: reset
reset:
	dropdb --if-exists -U $(DB_USER) $(DB_NAME)
	createdb -U $(DB_USER) $(DB_NAME)
	make init
	make seed

.PHONY: backup-timestamped
pgdump:
	pg_dump -U $(DB_USER) -d $(DB_NAME) -F c -f db_backup_$(shell date +%s).dump.sql

.PHONY: pgload
pgload:
	pg_restore -U $(DB_USER) -d $(DB_NAME) -c $(DUMP)
	@echo "Restored db_backup.dump into $(DB_NAME)"

.PHONY: new
new:
	@read -p "enter a new migration name (snake_case): " name; \
	timestamp=$$(date +%s); \
	filename="$(SCHEMA_DIR)/$${timestamp}_$${name}.sql"; \
	echo "-- :electric:txn:start\n\n-- :electric:txn:end" > "$$filename"; \
	echo "\\i $$(basename $$filename)" >> "$(INIT_FILE)"; \
	echo "created migration: $$filename, appended to $(INIT_FILE)."; \
	echo "DONE!"

.PHONY: apply
apply:
	@echo "Applying new migrations..."
	@psql "$$DATABASE_URL" -v ON_ERROR_STOP=1 -X -q -c \
	"CREATE TABLE IF NOT EXISTS schema_versions (
		filename TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ DEFAULT now()
	);"

	@for f in $(SCHEMA_DIR)/*.sql; do \
		basename=$$(basename $$f); \
		exists=$$(psql "$$DATABASE_URL" -t -q -X -c \
			"SELECT 1 FROM schema_versions WHERE filename = '$$basename'" | tr -d '[:space:]'); \
		if [ "$$exists" != "1" ]; then \
			echo "🚀 Running $$basename"; \
			psql "$$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X -f "$$f"; \
			psql "$$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X -c \
				"INSERT INTO schema_versions (filename) VALUES ('$$basename');"; \
		else \
			echo "Skipping $$basename (already applied)"; \
		fi; \
	done
