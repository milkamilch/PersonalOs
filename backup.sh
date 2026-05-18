#!/bin/bash
# Runs on the server via cron: 0 3 * * * /root/personalos/backup.sh
# Keeps last 7 daily backups of personalos.db
set -e
DB=/root/personalos/data/personalos.db
BACKUP_DIR=/root/personalos/data/backups
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y-%m-%d)
cp "$DB" "$BACKUP_DIR/personalos_${DATE}.db"
ls -t "$BACKUP_DIR"/personalos_*.db | tail -n +8 | xargs -r rm --
echo "[personalos-backup] $(date): backup saved as personalos_${DATE}.db"
