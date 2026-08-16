# Architecture and UML

## System context

```mermaid
flowchart LR
    Student["Verified Thapar student"] --> Web["React web client"]
    Admin["Allowlisted pilot admin"] --> Web
    Web -->|"HTTPS JSON + JWT"| API["Express API"]
    API --> Google["Google token verification"]
    API --> DB[("Supabase PostgreSQL")]
    API --> Storage["Private S3-compatible bucket"]
    GitHub["GitHub Actions"] --> Tests["Migrate, seed, test, build, smoke"]
    GitHub --> Pages["UCS503 GitHub Pages"]
    GitHub --> Render["Render API deployment"]
    GitHub --> Appwrite["Appwrite client deployment"]
```

## Use-case model

```mermaid
flowchart TB
    S((Student))
    O((Project owner))
    M((Accepted member))
    A((Pilot admin))

    S --> Profile[Maintain profile and skills]
    S --> Discover[Inspect explained recommendations]
    S --> Apply[Apply and track status]
    S --> Publish[Publish a project]
    O --> Review[Accept or reject applicants]
    O --> Lifecycle[Edit, close, or delete owned project]
    M --> Contacts[View authorized contacts and profiles]
    M --> Workspace[Manage shared tasks]
    A --> Moderate[Delete tenant project with audit reason]
```

Every authenticated account may become both collaborator and owner. The labels describe the actor's relationship to a specific resource, not a permanent user role.

## Container design

```mermaid
flowchart LR
    UI["React routes and components"] --> HTTP["API client"]
    HTTP --> Routes["Express routes + Zod validation"]
    Routes --> Controllers["Authorization + orchestration"]
    Controllers --> Services["Matching, team workflow, storage, identity"]
    Controllers --> Models["Parameterized SQL models"]
    Services --> Models
    Models --> PG[(PostgreSQL)]
    Services --> S3[(Object storage)]
```

Design responsibilities:

- React pages own presentation and user interaction, not permission decisions.
- Routes own HTTP shape and schema validation.
- Controllers enforce resource and relationship authorization.
- Services own multi-step domain workflows and adapters.
- Models contain parameterized queries and explicit transactions.
- The matching engine is pure and accepts plain objects, making score logic independently testable.

## Apply-to-workspace sequence

```mermaid
sequenceDiagram
    actor Student
    participant Client as React client
    participant API as Express API
    participant DB as PostgreSQL
    actor Owner

    Student->>Client: Apply to project
    Client->>API: POST /projects/:id/applications
    API->>DB: Check tenant, state, capacity, duplicate
    DB-->>API: Pending application
    API-->>Client: Application status
    Owner->>Client: Accept applicant
    Client->>API: PATCH /applications/:id/decision
    API->>DB: Begin and lock application/project
    API->>DB: Recheck owner and capacity
    API->>DB: Accept + create team/member + notification
    API->>DB: Commit
    API-->>Client: Authorized team ID
    Student->>Client: Open team workspace
    Client->>API: GET /teams/:id
    API->>DB: Verify creator/accepted membership
    DB-->>API: Members, contacts, tasks
    API-->>Client: Shared workspace
```

## Domain model

```mermaid
erDiagram
    COLLEGE ||--o{ USER : contains
    USER ||--|| STUDENT_PROFILE : owns
    STUDENT_PROFILE ||--o{ STUDENT_SKILL : has
    SKILL ||--o{ STUDENT_SKILL : rates
    USER ||--o{ PROJECT : creates
    COLLEGE ||--o{ PROJECT : scopes
    PROJECT ||--o{ PROJECT_SKILL : requires
    SKILL ||--o{ PROJECT_SKILL : labels
    STUDENT_PROFILE ||--o{ APPLICATION : submits
    PROJECT ||--o{ APPLICATION : receives
    PROJECT ||--o| TEAM : forms
    TEAM ||--o{ TEAM_MEMBER : contains
    STUDENT_PROFILE ||--o{ TEAM_MEMBER : joins
    TEAM ||--o{ TASK : tracks
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ ADMIN_AUDIT_LOG : performs
```

## Design principles

- **Least privilege:** contacts, profiles, resumes, ownership actions, and admin actions are filtered at the API boundary.
- **Explicit tenancy:** `college_id` is carried through user, project, and relationship queries.
- **Explainability before optimization:** ranking components remain visible and deterministic.
- **Progressive enhancement:** critical landing content remains visible even if WebGL or animation initialization fails.
- **Adapter boundaries:** resume storage can use local disk in development and S3-compatible storage in production.
- **Atomic domain changes:** acceptance, capacity, membership, notifications, moderation audit, and deletion use transactions where partial completion would be unsafe.

The lower-level schema and deployment boundaries are recorded in [Architecture](../architecture.md).
