#!/usr/bin/env zsh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
JAR="$SCRIPT_DIR/target/lecturebase-1.0.0-SNAPSHOT.jar"
MVN="/Users/larswenner/Applications/IntelliJ IDEA.app/Contents/plugins/maven/lib/maven3/bin/mvn"
LOG="$SCRIPT_DIR/app.log"
PID_FILE="$SCRIPT_DIR/.app.pid"

# .env laden falls vorhanden
[[ -f "$SCRIPT_DIR/.env" ]] && source "$SCRIPT_DIR/.env"

# ── Kill old process ─────────────────────────────────────────────────
if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Stoppe alten Prozess (PID $OLD_PID)..."
    kill "$OLD_PID"
    for i in {1..20}; do
      kill -0 "$OLD_PID" 2>/dev/null || break
      sleep 0.5
    done
    echo "Prozess beendet."
  fi
  rm -f "$PID_FILE"
fi

# Alle Java-Prozesse killen die LectureBase laufen lassen (JAR oder IntelliJ-Classpath)
pkill -f "LectureBaseApplication" 2>/dev/null || true
pkill -f "lecturebase.*\.jar"     2>/dev/null || true
# Warte kurz damit der Port freigegeben wird
sleep 1

# ── Build ────────────────────────────────────────────────────────────
echo "Baue Projekt..."
"$MVN" -f "$SCRIPT_DIR/pom.xml" package -q -Dmaven.test.skip=true

# ── Start ────────────────────────────────────────────────────────────
echo "Starte LectureBase..."
nohup java \
  -DCLAUDE_API_KEY="${CLAUDE_API_KEY:-}" \
  -DGEMINI_API_KEY="${GEMINI_API_KEY:-}" \
  -DVOYAGE_API_KEY="${VOYAGE_API_KEY:-}" \
  -jar "$JAR" \
  > "$LOG" 2>&1 &

NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"
echo "Gestartet (PID $NEW_PID) – Logs: $LOG"
echo "Warte auf Start..."

# Warte bis Port 8080 antwortet (max 30s)
for i in {1..30}; do
  curl -s http://localhost:8080 > /dev/null 2>&1 && break
  sleep 1
done

echo "App läuft unter http://localhost:8080"
