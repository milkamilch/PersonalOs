package de.lecturebase.model;

public class Todo {
    private Long    id;
    private Long    projectId;
    private String  text;
    private boolean done;
    private String  createdAt;

    public Long    getId()                       { return id; }
    public void    setId(Long id)               { this.id = id; }

    public Long    getProjectId()                { return projectId; }
    public void    setProjectId(Long pid)       { this.projectId = pid; }

    public String  getText()                     { return text; }
    public void    setText(String text)         { this.text = text; }

    public boolean isDone()                      { return done; }
    public void    setDone(boolean done)        { this.done = done; }

    public String  getCreatedAt()                { return createdAt; }
    public void    setCreatedAt(String d)       { this.createdAt = d; }
}
