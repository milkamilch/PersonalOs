package de.lecturebase.model;

public class Project {
    private Long   id;
    private String name;
    private String description;
    private String color;
    private String createdAt;
    private int    docCount;
    private int    todoCount;
    private int    openTodoCount;

    public Long   getId()                       { return id; }
    public void   setId(Long id)               { this.id = id; }

    public String getName()                     { return name; }
    public void   setName(String name)         { this.name = name; }

    public String getDescription()              { return description; }
    public void   setDescription(String d)     { this.description = d; }

    public String getColor()                    { return color; }
    public void   setColor(String color)       { this.color = color; }

    public String getCreatedAt()                { return createdAt; }
    public void   setCreatedAt(String d)       { this.createdAt = d; }

    public int    getDocCount()                 { return docCount; }
    public void   setDocCount(int n)           { this.docCount = n; }

    public int    getTodoCount()                { return todoCount; }
    public void   setTodoCount(int n)          { this.todoCount = n; }

    public int    getOpenTodoCount()            { return openTodoCount; }
    public void   setOpenTodoCount(int n)      { this.openTodoCount = n; }
}
