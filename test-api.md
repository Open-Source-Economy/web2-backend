# API Testing Guide

## Authentication Flow

### 1. GitHub OAuth Login
Open in browser: `http://localhost:3001/api/v1/auth/github`
This will redirect you to GitHub for authentication.

### 2. Check Authentication Status
```bash
curl http://localhost:3001/api/v1/auth/status
```

## Onboarding API Endpoints

After authentication, you can test these endpoints:

### Profile Management

#### Create Developer Profile
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{}'
```

#### Get Developer Profile
```bash
curl http://localhost:3001/api/v1/onboarding/profile \
  -H "Cookie: [YOUR_SESSION_COOKIE]"
```

### Developer Settings

#### Set Developer Settings
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{
    "incomeStreams": ["royalties", "services"],
    "hourlyWeeklyCommitment": 20,
    "openToOtherOpportunity": "yes",
    "hourlyRate": 150,
    "currency": "USD"
  }'
```

### GitHub Integration

#### Get Your GitHub Organizations
```bash
curl http://localhost:3001/api/v1/onboarding/github/organizations \
  -H "Cookie: [YOUR_SESSION_COOKIE]"
```

#### Get Your GitHub Repositories
```bash
curl http://localhost:3001/api/v1/onboarding/github/user/repositories \
  -H "Cookie: [YOUR_SESSION_COOKIE]"
```

#### Get Organization Repositories
```bash
curl http://localhost:3001/api/v1/onboarding/github/organizations/[ORG_NAME]/repositories \
  -H "Cookie: [YOUR_SESSION_COOKIE]"
```

### Repository Management

#### Add a Repository
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/repositories \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{
    "githubOwnerId": 12345,
    "githubOwnerLogin": "octocat",
    "githubRepositoryId": 67890,
    "githubRepositoryName": "my-repo",
    "mergeRights": ["full_rights"],
    "roles": ["maintainer"],
    "services": [
      {
        "serviceId": "[SERVICE_UUID]",
        "hourlyRate": 150,
        "currency": "USD",
        "responseTimeHours": 24
      }
    ]
  }'
```

#### Get Your Repositories
```bash
curl http://localhost:3001/api/v1/onboarding/repositories \
  -H "Cookie: [YOUR_SESSION_COOKIE]"
```

### Services

#### Get Available Services
```bash
curl http://localhost:3001/api/v1/onboarding/services \
  -H "Cookie: [YOUR_SESSION_COOKIE]"
```

#### Add Developer Service
```bash
curl -X POST http://localhost:3001/api/v1/onboarding/developer-services \
  -H "Content-Type: application/json" \
  -H "Cookie: [YOUR_SESSION_COOKIE]" \
  -d '{
    "projectItemId": "[PROJECT_ITEM_UUID]",
    "serviceId": "[SERVICE_UUID]",
    "hourlyRate": 150,
    "currency": "USD",
    "responseTimeHours": 24
  }'
```

### Complete Onboarding

```bash
curl -X POST http://localhost:3001/api/v1/onboarding/complete \
  -H "Cookie: [YOUR_SESSION_COOKIE]"
```

## Testing Without Browser

To get a session cookie programmatically, you would need to:
1. Implement a test user creation endpoint (for development only)
2. Or use a tool like Puppeteer to automate the GitHub OAuth flow
3. Or manually copy the cookie from browser DevTools after logging in

## Getting Your Session Cookie from Browser

1. Open Chrome/Firefox DevTools (F12)
2. Go to Application/Storage tab
3. Find Cookies > http://localhost:3001
4. Copy the value of the session cookie (usually named 'connect.sid' or similar)
5. Use it in the curl commands above

## Test Data

The services table is pre-populated with these categories:
- Support (Bug Fixes, New Features, Code Maintenance)
- Development (Technical Assistance, Deployment Guidance, Customer Support)
- Operation (Incident Response, Proactive Monitoring, 24/7 Supervision)
- Advisory (Architecture Design, Technology Assessment, Security & Performance)

## Example Test Flow

1. Login via GitHub OAuth in browser
2. Get session cookie from browser
3. Create developer profile
4. Set developer settings
5. Get your GitHub repositories
6. Add a repository with services
7. Complete onboarding