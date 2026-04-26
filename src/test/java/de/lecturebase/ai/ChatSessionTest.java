package de.lecturebase.ai;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChatSessionTest {

    @Test
    void neueSessionHatLeereHistory() {
        ChatSession session = new ChatSession("abc");
        assertThat(session.getHistory()).isEmpty();
    }

    @Test
    void addFuegtNachrichtenInReihenfolgeHinzu() {
        ChatSession session = new ChatSession("s1");
        session.add("user", "Was ist Quicksort?");
        session.add("assistant", "Quicksort ist...");

        assertThat(session.getHistory()).hasSize(2);
        assertThat(session.getHistory().get(0).role()).isEqualTo("user");
        assertThat(session.getHistory().get(1).role()).isEqualTo("assistant");
    }

    @Test
    void historyWirdBeiMaxLimitBegrenzt() {
        ChatSession session = new ChatSession("s2");
        // 11 Runden = 22 Nachrichten → MAX_HISTORY (10) * 2 = 20 werden behalten
        for (int i = 0; i < 11; i++) {
            session.add("user", "Frage " + i);
            session.add("assistant", "Antwort " + i);
        }
        assertThat(session.getHistory()).hasSize(20);
    }

    @Test
    void aeltesteNachrichtenWerdenBeiUeberlaufEntfernt() {
        ChatSession session = new ChatSession("s3");
        for (int i = 0; i < 11; i++) {
            session.add("user", "Frage " + i);
            session.add("assistant", "Antwort " + i);
        }
        // Die erste Runde (Frage 0, Antwort 0) wurde entfernt
        assertThat(session.getHistory().get(0).content()).isEqualTo("Frage 1");
    }

    @Test
    void sessionIdWirdKorrektGespeichert() {
        ChatSession session = new ChatSession("meine-session-id");
        assertThat(session.getSessionId()).isEqualTo("meine-session-id");
    }
}
