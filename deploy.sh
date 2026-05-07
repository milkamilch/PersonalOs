#!/usr/bin/env bash
# PersonalOS — One-command deploy to Hetzner VPS
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER="178.104.52.85"
SERVER_USER="root"

# ── Load env ─────────────────────────────────────────────────────────────────
[[ -f "$SCRIPT_DIR/.env" ]] && source "$SCRIPT_DIR/.env"
[[ -f "$SCRIPT_DIR/env.sh" ]] && source "$SCRIPT_DIR/env.sh" 2>/dev/null || true

SERVER_PASS="${SERVER_SSH_PASS:-}"

MVN="/home/lars/.local/share/JetBrains/Toolbox/apps/intellij-idea/plugins/maven/lib/maven3/bin/mvn"
JAVA="/home/lars/.local/share/JetBrains/Toolbox/apps/intellij-idea/jbr/bin/java"
export JAVA_HOME="$(dirname "$(dirname "$JAVA")")"

echo "═══════════════════════════════════════"
echo "  PersonalOS — Deploy"
echo "═══════════════════════════════════════"

# ── 1. Frontend build ──────────────────────────────────────────────────────
echo ""
echo "▶ [1/4] Frontend bauen…"
cd "$SCRIPT_DIR/frontend"
npm run build
cd "$SCRIPT_DIR"

# ── 2. Copy frontend dist into resources ────────────────────────────────────
echo "▶ [2/4] Frontend nach Backend kopieren…"
STATIC="$SCRIPT_DIR/src/main/resources/static"
rm -rf "$STATIC"
cp -r "$SCRIPT_DIR/frontend/dist" "$STATIC"

# ── 3. Maven build ──────────────────────────────────────────────────────────
echo "▶ [3/4] Backend bauen…"
"$MVN" -f "$SCRIPT_DIR/pom.xml" clean package -q -Dmaven.test.skip=true

JAR="$SCRIPT_DIR/target/lecturebase-1.0.0-SNAPSHOT.jar"
cp "$JAR" "$SCRIPT_DIR/app.jar"

# ── 4. Upload & restart ─────────────────────────────────────────────────────
echo "▶ [4/4] Auf Server hochladen und neustarten…"
export SCRIPT_DIR
python3 - <<'PYEOF'
import paramiko, os, sys

host     = os.environ.get("SERVER", "178.104.52.85")
user     = os.environ.get("SERVER_USER", "root")
password = os.environ.get("SERVER_SSH_PASS") or os.environ.get("SERVER_PASS")
local    = os.path.join(os.environ["SCRIPT_DIR"], "app.jar")
remote   = "/root/personalos/app.jar"

if not password:
    print("ERROR: SERVER_SSH_PASS nicht gesetzt", file=sys.stderr)
    sys.exit(1)

print(f"  Verbinde mit {user}@{host}…")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=15)

# Ensure remote directory exists
client.exec_command("mkdir -p /root/personalos/data")

print(f"  Lade app.jar hoch ({os.path.getsize(local)//1024//1024} MB)…")
sftp = client.open_sftp()
sftp.put(local, remote)

# Upload supporting files
script_dir = os.environ["SCRIPT_DIR"]
for fname in ["Dockerfile", "docker-compose.yml"]:
    src = os.path.join(script_dir, fname)
    if os.path.exists(src):
        sftp.put(src, f"/root/personalos/{fname}")
        print(f"  {fname} hochgeladen")
sftp.close()

# Write .env on server
env_vars = {
    "GITHUB_TOKEN":    os.environ.get("GITHUB_TOKEN", ""),
    "GITHUB_USERNAME": os.environ.get("GITHUB_USERNAME", ""),
    "SERVER_HOST":     os.environ.get("SERVER_HOST", ""),
    "SERVER_SSH_USER": os.environ.get("SERVER_SSH_USER", "root"),
    "SERVER_SSH_PASS": os.environ.get("SERVER_SSH_PASS", ""),
    "APP_PASSWORD":    os.environ.get("APP_PASSWORD", ""),
}
env_content = "\n".join(f"{k}={v}" for k, v in env_vars.items())
_, _, _ = client.exec_command(f"echo '{env_content}' > /root/personalos/.env")

print("  Starte Container neu…")
_, stdout, stderr = client.exec_command(
    "cd /root/personalos && docker compose up -d --build --force-recreate 2>&1"
)
out = stdout.read().decode()
err = stderr.read().decode()
if out: print(out)
if err: print(err, file=sys.stderr)

client.close()
print("  Done!")
PYEOF

echo ""
echo "═══════════════════════════════════════"
echo "  ✓ Deploy abgeschlossen!"
echo "  → http://$SERVER:8090"
echo "═══════════════════════════════════════"
