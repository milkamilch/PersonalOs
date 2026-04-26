package de.lecturebase.model;

public class Flashcard {
    private Long   id;
    private Long   documentId;
    private Long   chunkId;
    private String question;
    private String answer;

    public Long   getId()         { return id; }
    public void   setId(Long id)  { this.id = id; }

    public Long   getDocumentId()             { return documentId; }
    public void   setDocumentId(Long docId)   { this.documentId = docId; }

    public Long   getChunkId()              { return chunkId; }
    public void   setChunkId(Long chunkId)  { this.chunkId = chunkId; }

    public String getQuestion()               { return question; }
    public void   setQuestion(String q)       { this.question = q; }

    public String getAnswer()                 { return answer; }
    public void   setAnswer(String a)         { this.answer = a; }
}
