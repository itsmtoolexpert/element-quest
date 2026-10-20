#!/bin/sh
# Optional: serve Element Quest over HTTPS on your home network (macOS).
#
# Why: browsers only allow "install as an app" fully and keep working pages while the laptop is
# asleep on HTTPS (or on localhost). This makes a certificate that your own devices trust, using
# mkcert (https://github.com/FiloSottile/mkcert).
#
#   ./scripts/https-setup.sh
set -e
cd "$(dirname "$0")/.."

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert isn't installed. Install it with Homebrew, then run this again:"
  echo "  brew install mkcert"
  exit 1
fi
if [ ! -f .env ]; then
  echo "No .env yet. Run ./scripts/setup.sh first."
  exit 1
fi

host="$(scutil --get LocalHostName 2>/dev/null || hostname -s).local"
ip="$(ipconfig getifaddr en0 2>/dev/null || true)"

# Creates a private certificate authority on this Mac (asks for your password once) and trusts it here.
mkcert -install

mkdir -p certs
# shellcheck disable=SC2086
mkcert -cert-file certs/element-quest.pem -key-file certs/element-quest-key.pem \
  "$host" localhost 127.0.0.1 $ip

# Make plain `docker compose` commands include the HTTPS settings.
if ! grep -q '^COMPOSE_FILE=' .env; then
  printf '\n# Added by scripts/https-setup.sh\nCOMPOSE_FILE=docker-compose.yml:docker-compose.https.yml\n' >> .env
fi
port="$(grep -E '^WEB_HTTPS_PORT=' .env | cut -d= -f2)"
port="${port:-8443}"
wport="$(grep -E '^WEB_PORT=' .env | cut -d= -f2)"
wport="${wport:-8080}"

docker compose up -d

caroot="$(mkcert -CAROOT)"
cat <<EOF

HTTPS is on.
  On this Mac:        https://localhost:$port
  On other devices:   https://$host:$port${ip:+   (or https://$ip:$port)}

Each phone or tablet must trust your certificate authority once. The file is:
  $caroot/rootCA.pem

iPhone / iPad:
  1. AirDrop that file to the device (or email it to yourself and open it in Mail).
  2. Settings > Profile Downloaded > Install.
  3. Settings > General > About > Certificate Trust Settings > turn on full trust for the "mkcert …" certificate.

Android (menu names vary by phone):
  Copy the file to the phone, then Settings > Security > Encryption & credentials >
  Install a certificate > CA certificate, and pick rootCA.pem.

Then open the https address above in Safari or Chrome and add it to the home screen.
Plain http on port $wport keeps working too.
EOF
