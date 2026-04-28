package de.lecturebase.model;

public class Flashcard {
    private Long    id;
    private Long    documentId;
    private Long    chunkId;
    private String  question;
    private String  answer;
    private Boolean known;
    private double  easiness    = 2.5;
    private int     repetitions = 0;
    private int     intervalDays = 0;
    private String  nextReview;   // ISO date YYYY-MM-DD, null = noch nie gelernt

    public Long    getId()                      { return id; }
    public void    setId(Long id)               { this.id = id; }

    public Long    getDocumentId()              { return documentId; }
    public void    setDocumentId(Long docId)    { this.documentId = docId; }

    public Long    getChunkId()                 { return chunkId; }
    public void    setChunkId(Long chunkId)     { this.chunkId = chunkId; }

    public String  getQuestion()                { return question; }
    public void    setQuestion(String q)        { this.question = q; }

    public String  getAnswer()                  { return answer; }
    public void    setAnswer(String a)          { this.answer = a; }

    public Boolean getKnown()                   { return known; }
    public void    setKnown(Boolean known)      { this.known = known; }

    public double  getEasiness()                { return easiness; }
    public void    setEasiness(double e)        { this.easiness = e; }

    public int     getRepetitions()             { return repetitions; }
    public void    setRepetitions(int r)        { this.repetitions = r; }

    public int     getIntervalDays()            { return intervalDays; }
    public void    setIntervalDays(int d)       { this.intervalDays = d; }

    public String  getNextReview()              { return nextReview; }
    public void    setNextReview(String d)      { this.nextReview = d; }
}
