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
        };
    }
}
