#!/bin/sh
# Bring the schema up to date and add any missing seed rows, then start the server.
set -e
alembic upgrade head
python -m app.seed
exec "$@"
