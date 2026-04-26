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
        };
    }
}
