package de.lecturebase.storage;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class DatabaseConfig {

    @Bean
    public ApplicationRunner initDatabase(JdbcTemplate jdbc) {
        return args -> {
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    name        TEXT    NOT NULL,
                    file_path   TEXT    NOT NULL,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS chunks (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER NOT NULL,
                    page_number INTEGER NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    text        TEXT    NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);

            // Für Phase 3 (Mind Map) – wird später befüllt
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS concepts (
                    id   INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS concept_links (
                    concept_a INTEGER NOT NULL,
                    concept_b INTEGER NOT NULL,
                    weight    REAL    DEFAULT 1.0,
                    PRIMARY KEY (concept_a, concept_b),
                    FOREIGN KEY (concept_a) REFERENCES concepts(id),
                    FOREIGN KEY (concept_b) REFERENCES concepts(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id   INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS document_tags (
                    document_id INTEGER NOT NULL,
                    tag_id      INTEGER NOT NULL,
                    PRIMARY KEY (document_id, tag_id),
                    FOREIGN KEY (document_id) REFERENCES documents(id),
                    FOREIGN KEY (tag_id)      REFERENCES tags(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS chunk_embeddings (
                    chunk_id  INTEGER PRIMARY KEY,
                    embedding TEXT NOT NULL,
                    FOREIGN KEY (chunk_id) REFERENCES chunks(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS flashcards (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER NOT NULL,
                    chunk_id    INTEGER,
                    question    TEXT NOT NULL,
                    answer      TEXT NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS summaries (
                    document_id  INTEGER PRIMARY KEY,
                    summary      TEXT    NOT NULL,
                    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);

            // Migrations: Lernkarten-Tracking + SM-2 Spaced Repetition
            try { jdbc.execute("ALTER TABLE flashcards ADD COLUMN known INTEGER DEFAULT NULL"); } catch (Exception ignored) {}
            try { jdbc.execute("ALTER TABLE flashcards ADD COLUMN easiness REAL DEFAULT 2.5"); }    catch (Exception ignored) {}
            try { jdbc.execute("ALTER TABLE flashcards ADD COLUMN repetitions INTEGER DEFAULT 0"); } catch (Exception ignored) {}
            try { jdbc.execute("ALTER TABLE flashcards ADD COLUMN interval_days INTEGER DEFAULT 0"); } catch (Exception ignored) {}
            try { jdbc.execute("ALTER TABLE flashcards ADD COLUMN next_review TEXT DEFAULT NULL"); }  catch (Exception ignored) {}

            // Migration: Duplikat-Erkennung
            try { jdbc.execute("ALTER TABLE documents ADD COLUMN file_hash TEXT DEFAULT NULL"); } catch (Exception ignored) {}
            // Migration: Lernaktivität tracken (für Dashboard/Streak)
            try { jdbc.execute("ALTER TABLE flashcards ADD COLUMN rated_at TEXT DEFAULT NULL"); } catch (Exception ignored) {}

            // Migration: Prüfungsdaten
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS exam_dates (
                    document_id INTEGER PRIMARY KEY,
                    exam_date   TEXT NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS mindmap_status (
                    document_id INTEGER PRIMARY KEY,
                    built_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS concept_documents (
                    concept_id  INTEGER NOT NULL,
                    document_id INTEGER NOT NULL,
                    PRIMARY KEY (concept_id, document_id),
                    FOREIGN KEY (concept_id)  REFERENCES concepts(id),
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS concept_chunk_done (
                    chunk_id INTEGER PRIMARY KEY,
                    FOREIGN KEY (chunk_id) REFERENCES chunks(id)
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id         TEXT PRIMARY KEY,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);

            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT    NOT NULL,
                    role       TEXT    NOT NULL,
                    content    TEXT    NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
                )
            """);

            // Projekte (#10) + Todos (#11)
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    name        TEXT    NOT NULL,
                    description TEXT    DEFAULT '',
                    color       TEXT    DEFAULT '#7c3aed',
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS project_documents (
                    project_id  INTEGER NOT NULL,
                    document_id INTEGER NOT NULL,
                    PRIMARY KEY (project_id, document_id),
                    FOREIGN KEY (project_id)  REFERENCES projects(id),
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS project_notes (
                    project_id  INTEGER PRIMARY KEY,
                    content     TEXT    NOT NULL DEFAULT '',
                    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id)
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS todos (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id  INTEGER,
                    text        TEXT    NOT NULL,
                    done        INTEGER NOT NULL DEFAULT 0,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects(id)
                )
            """);

            // Lernplaner (#F3)
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS study_plans (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER NOT NULL,
                    exam_date   TEXT    NOT NULL,
                    total_pages INTEGER NOT NULL DEFAULT 0,
                    pages_done  INTEGER NOT NULL DEFAULT 0,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS study_log (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    plan_id    INTEGER NOT NULL,
                    log_date   TEXT    NOT NULL DEFAULT (DATE('now')),
                    pages_done INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(plan_id, log_date),
                    FOREIGN KEY (plan_id) REFERENCES study_plans(id)
                )
            """);

            // ── Habits ────────────────────────────────────────────────────
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS habits (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    name       TEXT    NOT NULL,
                    icon       TEXT    NOT NULL DEFAULT '✓',
                    color      TEXT    NOT NULL DEFAULT '#7c3aed',
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS habit_entries (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    habit_id   INTEGER NOT NULL,
                    entry_date TEXT    NOT NULL,
                    UNIQUE(habit_id, entry_date),
                    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
                )
            """);

            // ── Finance ───────────────────────────────────────────────────
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS finance_categories (
                    id             INTEGER PRIMARY KEY AUTOINCREMENT,
                    name           TEXT    NOT NULL,
                    icon           TEXT    NOT NULL DEFAULT '💳',
                    color          TEXT    NOT NULL DEFAULT '#7c3aed',
                    budget_monthly REAL    NOT NULL DEFAULT 0,
                    type           TEXT    NOT NULL DEFAULT 'expense',
                    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS finance_transactions (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_id INTEGER,
                    amount      REAL    NOT NULL,
                    description TEXT    NOT NULL DEFAULT '',
                    tx_date     TEXT    NOT NULL DEFAULT (DATE('now')),
                    type        TEXT    NOT NULL DEFAULT 'expense',
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES finance_categories(id)
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS finance_settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS finance_recurring (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    name              TEXT    NOT NULL,
                    amount            REAL    NOT NULL,
                    type              TEXT    NOT NULL DEFAULT 'expense',
                    category_id       INTEGER,
                    day_of_month      INTEGER NOT NULL DEFAULT 1,
                    active            INTEGER NOT NULL DEFAULT 1,
                    last_booked_month TEXT,
                    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES finance_categories(id)
                )
            """);
            try { jdbc.execute("ALTER TABLE finance_recurring ADD COLUMN last_booked_month TEXT"); } catch (Exception ignored) {}

            // ── Fitness ───────────────────────────────────────────────────
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS workouts (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    name       TEXT    NOT NULL,
                    notes      TEXT    NOT NULL DEFAULT '',
                    workout_date TEXT  NOT NULL DEFAULT (DATE('now')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS workout_exercises (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    workout_id  INTEGER NOT NULL,
                    name        TEXT    NOT NULL,
                    sets        INTEGER NOT NULL DEFAULT 0,
                    reps        INTEGER NOT NULL DEFAULT 0,
                    weight_kg   REAL    NOT NULL DEFAULT 0,
                    duration_min INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
                )
            """);

            // ── Media (Bücher + Serien/Filme) ─────────────────────────────
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS media_items (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    type        TEXT    NOT NULL DEFAULT 'book',
                    title       TEXT    NOT NULL,
                    creator     TEXT    NOT NULL DEFAULT '',
                    status      TEXT    NOT NULL DEFAULT 'want',
                    rating      INTEGER,
                    notes       TEXT    NOT NULL DEFAULT '',
                    finished_at TEXT,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);

            // ── Goals ─────────────────────────────────────────────────────
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS goals (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    title       TEXT    NOT NULL,
                    description TEXT    NOT NULL DEFAULT '',
                    horizon     TEXT    NOT NULL DEFAULT 'month',
                    status      TEXT    NOT NULL DEFAULT 'active',
                    progress    INTEGER NOT NULL DEFAULT 0,
                    target_date TEXT,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);

            // ── Journal ───────────────────────────────────────────────────
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS journal_entries (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    entry_date TEXT    NOT NULL UNIQUE,
                    mood       INTEGER NOT NULL DEFAULT 3,
                    content    TEXT    NOT NULL DEFAULT '',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS reading_sessions (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    media_id    INTEGER NOT NULL,
                    pages_read  INTEGER NOT NULL DEFAULT 0,
                    minutes     INTEGER NOT NULL DEFAULT 0,
                    session_date TEXT   NOT NULL,
                    note        TEXT    NOT NULL DEFAULT '',
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (media_id) REFERENCES media_items(id)
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    name        TEXT    NOT NULL,
                    email       TEXT    NOT NULL DEFAULT '',
                    phone       TEXT    NOT NULL DEFAULT '',
                    company     TEXT    NOT NULL DEFAULT '',
                    notes       TEXT    NOT NULL DEFAULT '',
                    tag         TEXT    NOT NULL DEFAULT '',
                    last_contact TEXT,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS time_entries (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    project     TEXT    NOT NULL DEFAULT '',
                    description TEXT    NOT NULL DEFAULT '',
                    started_at  DATETIME NOT NULL,
                    stopped_at  DATETIME,
                    duration_s  INTEGER,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS recurring_todos (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    text        TEXT    NOT NULL,
                    recurrence  TEXT    NOT NULL DEFAULT 'daily',
                    active      INTEGER NOT NULL DEFAULT 1,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS recurring_todo_done (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    recurring_id    INTEGER NOT NULL,
                    done_date       TEXT    NOT NULL,
                    UNIQUE(recurring_id, done_date),
                    FOREIGN KEY (recurring_id) REFERENCES recurring_todos(id)
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS body_weight (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    weight_kg   REAL    NOT NULL,
                    log_date    TEXT    NOT NULL UNIQUE,
                    note        TEXT    NOT NULL DEFAULT '',
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS quick_notes (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    title      TEXT    NOT NULL DEFAULT '',
                    content    TEXT    NOT NULL DEFAULT '',
                    pinned     INTEGER NOT NULL DEFAULT 0,
                    color      TEXT    NOT NULL DEFAULT 'default',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    title       TEXT    NOT NULL,
                    event_date  TEXT    NOT NULL,
                    start_time  TEXT,
                    end_time    TEXT,
                    notes       TEXT    NOT NULL DEFAULT '',
                    color       TEXT    NOT NULL DEFAULT '#0a84ff',
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS weekly_planner_config (
                    id              INTEGER PRIMARY KEY DEFAULT 1,
                    wake_time       TEXT    NOT NULL DEFAULT '06:00',
                    routine_min     INTEGER NOT NULL DEFAULT 30,
                    prog_hours      INTEGER NOT NULL DEFAULT 2,
                    reading_min     INTEGER NOT NULL DEFAULT 30,
                    uni_start       TEXT    NOT NULL DEFAULT '10:00',
                    uni_end         TEXT    NOT NULL DEFAULT '16:00',
                    uni_days        TEXT    NOT NULL DEFAULT '1,2,3,4',
                    travel_uni_min  INTEGER NOT NULL DEFAULT 20,
                    travel_gym_min  INTEGER NOT NULL DEFAULT 15,
                    haushalt_min    INTEGER NOT NULL DEFAULT 60,
                    haushalt_day    INTEGER NOT NULL DEFAULT 5,
                    haushalt_start  TEXT    NOT NULL DEFAULT '10:00',
                    study_hours     INTEGER NOT NULL DEFAULT 0,
                    thesis_hours    INTEGER NOT NULL DEFAULT 0,
                    study_block_min INTEGER NOT NULL DEFAULT 90,
                    phase           INTEGER NOT NULL DEFAULT 1,
                    phase_week      INTEGER NOT NULL DEFAULT 1,
                    bed_hour        INTEGER NOT NULL DEFAULT 23,
                    bed_min         INTEGER NOT NULL DEFAULT 0
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS weekly_fixed_appointments (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    appt_id     TEXT    NOT NULL UNIQUE,
                    day_index   INTEGER NOT NULL,
                    title       TEXT    NOT NULL,
                    start_min   INTEGER NOT NULL,
                    duration_min INTEGER NOT NULL DEFAULT 60,
                    travel_min  INTEGER NOT NULL DEFAULT 0
                )
            """);
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS focus_sessions (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    duration_s  INTEGER NOT NULL DEFAULT 1500,
                    session_date TEXT   NOT NULL,
                    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """);
            // Migrations for existing tables (ignore errors if column already exists)
            try { jdbc.execute("ALTER TABLE todos ADD COLUMN goal_id INTEGER"); } catch (Exception ignored) {}
            try { jdbc.execute("ALTER TABLE time_entries ADD COLUMN goal_id INTEGER"); } catch (Exception ignored) {}
        };
    }
}
