package de.lecturebase.search;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SearchServiceHighlightTest {

    @Test
    void trefferWirdMitMarkUmschlossen() {
        String result = SearchService.highlight("Quicksort ist ein Algorithmus", "Quicksort");
        assertThat(result).isEqualTo("<mark>Quicksort</mark> ist ein Algorithmus");
    }

    @Test
    void highlightIstCaseInsensitive() {
        String result = SearchService.highlight("quicksort ist schnell", "Quicksort");
        assertThat(result).contains("<mark>quicksort</mark>");
    }

    @Test
    void mehrereQueryTermeWerdenAlleMarkiert() {
        String result = SearchService.highlight("Quicksort und Mergesort sind Algorithmen", "Quicksort Mergesort");
        assertThat(result).contains("<mark>Quicksort</mark>");
        assertThat(result).contains("<mark>Mergesort</mark>");
    }

    @Test
    void keinTrefferLaessenTextUnveraendert() {
        String text = "Datenbanken und SQL";
        String result = SearchService.highlight(text, "Quicksort");
        assertThat(result).isEqualTo(text);
    }

    @Test
    void kurzeTeremeUnterZweiZeichenWerdenIgnoriert() {
        String text = "a b c Algorithmus";
        String result = SearchService.highlight(text, "a Algorithmus");
        // "a" (1 Zeichen) wird ignoriert, Algorithmus wird markiert
        assertThat(result).doesNotContain("<mark>a</mark>");
        assertThat(result).contains("<mark>Algorithmus</mark>");
    }

    @Test
    void mehrereTrefferImTextWerdenAlleMarkiert() {
        String result = SearchService.highlight("sort und sort und sort", "sort");
        assertThat(result).isEqualTo("<mark>sort</mark> und <mark>sort</mark> und <mark>sort</mark>");
    }
}
