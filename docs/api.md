# API guide

Base URL: `http://localhost:4000/api`

Authenticated endpoints expect `Authorization: Bearer <token>`. Responses use JSON except for PDF uploads. Validation and authorization errors share the same shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

## Authentication

When `AUTH_ALLOWED_EMAIL_DOMAIN` is configured, public password signup is disabled so an unverified address cannot bypass the institution boundary. Google Sign-In verifies the token signature, audience, expiration, `email_verified`, exact email domain, and Google Workspace hosted domain on the server.

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@northstar.edu","password":"strongpass","name":"New Student","department":"Computer Science","year":3}'

curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"isha@northstar.edu","password":"demo1234"}'

# Send the credential returned by Google Identity Services.
curl -X POST http://localhost:4000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"credential":"GOOGLE_ID_TOKEN"}'
```

Keep the returned `token` and send it as a bearer token in the examples below.

## Student profile and skills

```bash
curl http://localhost:4000/api/students/me \
  -H "Authorization: Bearer $TOKEN"

curl -X PUT http://localhost:4000/api/students/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bio":"Frontend engineer interested in climate tools.","interests":["Climate Tech"],"availabilityHoursPerWeek":12}'

curl -X POST http://localhost:4000/api/students/1/resume \
  -H "Authorization: Bearer $TOKEN" \
  -F "resume=@resume.pdf"

curl -X PUT http://localhost:4000/api/students/1/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"skills":[{"skillId":3,"proficiency":5},{"skillId":2,"proficiency":4}]}'
```

Resume upload returns proposed skill matches. The client presents them for review and only persists the selected list through the skills endpoint.

## Projects and recommendations

```bash
curl "http://localhost:4000/api/projects?domain=Climate%20Tech&skill=React&commitmentMax=12" \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:4000/api/recommendations/projects \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:4000/api/projects/1/apply \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:4000/api/applications \
  -H "Authorization: Bearer $TOKEN"
```

Project owners can inspect applicants and rank candidates who complement the current team:

```bash
curl "http://localhost:4000/api/projects?mine=true" \
  -H "Authorization: Bearer $OWNER_TOKEN"

curl http://localhost:4000/api/projects/1/applications \
  -H "Authorization: Bearer $OWNER_TOKEN"

curl http://localhost:4000/api/recommendations/teammates/1 \
  -H "Authorization: Bearer $OWNER_TOKEN"

curl -X PUT http://localhost:4000/api/applications/12 \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"accepted"}'
```

Accepting the first applicant creates a team in the same database transaction. Later acceptances reuse that team, recheck capacity while locked, insert membership, and notify the applicant atomically.

## Team workspace and notifications

```bash
curl http://localhost:4000/api/teams \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:4000/api/teams/1 \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:4000/api/teams/1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Draft the usability test","assignedTo":1,"status":"todo","dueDate":"2026-09-01"}'

curl -X PUT http://localhost:4000/api/tasks/4 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'

curl http://localhost:4000/api/notifications \
  -H "Authorization: Bearer $TOKEN"

curl -X PUT http://localhost:4000/api/notifications/3/read \
  -H "Authorization: Bearer $TOKEN"
```

The browser client polls notifications; no WebSocket service is required for the MVP.
