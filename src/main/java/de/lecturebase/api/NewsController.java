package de.lecturebase.api;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.w3c.dom.*;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.*;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private static final Map<String, String> FEEDS = Map.of(
            "de",      "https://www.tagesschau.de/xml/rss2",
            "world",   "https://feeds.bbci.co.uk/news/world/rss.xml",
            "bvb",     "https://www.kicker.de/borussia-dortmund/news/rss.xml",
            "vikings", "https://www.vikings.com/rss/news.xml"
    );

    private final RestTemplate rest;

    public NewsController() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(6000);
        factory.setReadTimeout(10000);
        this.rest = new RestTemplate(factory);
    }

    @GetMapping
    public ResponseEntity<?> news(@RequestParam String feed) {
        String url = FEEDS.get(feed);
        if (url == null) return ResponseEntity.badRequest().body(Map.of("error", "Unknown feed: " + feed));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (compatible; LectureBase/1.0)");
            headers.set("Accept", "application/rss+xml, application/xml, text/xml, */*");
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> resp = rest.exchange(url, HttpMethod.GET, entity, String.class);
            String xml = resp.getBody();
            if (xml == null || xml.isBlank()) throw new IllegalStateException("Empty response");
            List<Map<String, String>> items = parseRss(xml);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
        }
    }

    private List<Map<String, String>> parseRss(String xml) throws Exception {
        // strip any BOM or leading whitespace
        xml = xml.stripLeading().replaceFirst("^[^<]+", "");

        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setExpandEntityReferences(false);

        org.w3c.dom.Document doc = factory.newDocumentBuilder()
                .parse(new InputSource(new StringReader(xml)));

        NodeList nodeList = doc.getElementsByTagName("item");
        List<Map<String, String>> result = new ArrayList<>();

        for (int i = 0; i < Math.min(nodeList.getLength(), 15); i++) {
            Element item = (Element) nodeList.item(i);
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("title",       text(item, "title"));
            entry.put("link",        text(item, "link"));
            entry.put("pubDate",     text(item, "pubDate"));
            entry.put("description", stripHtml(text(item, "description")));
            result.add(entry);
        }
        return result;
    }

    private String text(Element el, String tag) {
        NodeList nl = el.getElementsByTagName(tag);
        if (nl.getLength() == 0) return "";
        Node n = nl.item(0);
        return n.getTextContent() != null ? n.getTextContent().trim() : "";
    }

    private String stripHtml(String html) {
        if (html == null || html.isBlank()) return "";
        return html.replaceAll("<[^>]+>", "")
                   .replaceAll("&amp;", "&")
                   .replaceAll("&lt;", "<")
                   .replaceAll("&gt;", ">")
                   .replaceAll("&quot;", "\"")
                   .replaceAll("&#\\d+;", "")
                   .replaceAll("&[a-zA-Z]+;", " ")
                   .trim();
    }
}
