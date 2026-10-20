#!/bin/sh
# Create .env with random secrets (only if it doesn't exist yet), then print the passwords.
#   ./scripts/setup.sh
set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env already exists; leaving it alone."
  grep -E '^(ADMIN_PASSWORD|STUDENT_DEFAULT_PASSWORD)=' .env
  exit 0
fi

rand() { openssl rand -hex "$1"; }
admin_pw="$(rand 6)"

cp .env.example .env
# BSD sed (macOS) and GNU sed both accept -i.bak
sed -i.bak \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(rand 16)|" \
  -e "s|^SECRET_KEY=.*|SECRET_KEY=$(rand 32)|" \
  -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$admin_pw|" \
  .env
rm -f .env.bak

echo "Created .env"
echo "  Parent / Teacher password: $admin_pw"
echo "  Student password:          elements"
echo "Change ADMIN_PASSWORD in .env before the first 'docker compose up' if you want your own."
