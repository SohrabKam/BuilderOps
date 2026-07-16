# NoticeGuard API (v1)

A REST API for connecting other software to NoticeGuard — pull payment
cycle/subcontract/compliance data out, or push applications and compliance
documents in. Everything under `/api/v1/*` is authenticated by API key and
scoped to a single organisation; it's separate from the routes the
NoticeGuard web app itself uses internally.

## Authentication

Create a key from **Settings → API keys** (Admin role required). The
plaintext key is shown exactly once at creation — copy it immediately, it
can't be retrieved again afterwards (only revoked and replaced).

Send it as a bearer token on every request:

```
Authorization: Bearer ng_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Requests without a valid, non-revoked key get `401`. Requests with a
`READ`-scope key hitting a write endpoint get `403`.

### Scopes

| Scope | Can do |
|---|---|
| `READ` | All `GET` endpoints |
| `WRITE` | Everything `READ` can, plus `POST` endpoints |

There's one scope per key, not per-endpoint — issue a `READ`-only key for
something like a BI tool or dashboard, and a separate `WRITE` key for a
full two-way integration, so a compromised read-only key can't be used to
write data.

## Base URL

```
https://<your-deployment>/api/v1
```

## Errors

Every error response is JSON: `{ "error": "..." }` (validation failures
return `{ "error": { "fieldErrors": {...}, "formErrors": [...] } }` — the
shape Zod produces). Standard HTTP status codes: `400` invalid input, `401`
missing/invalid key, `403` insufficient scope, `404` not found (including
when the resource exists but belongs to a different organisation — the API
never reveals whether a given ID exists outside your own org), `409`
conflict (e.g. an application already logged for that cycle).

## Pagination

List endpoints accept `?limit=` (default 20, max 100) and `?offset=`
(default 0), and return:

```json
{
  "data": [ /* ... */ ],
  "pagination": { "limit": 20, "offset": 0, "total": 47 }
}
```

---

## `GET /subcontracts`

List subcontracts for your organisation.

**Query params:** `limit`, `offset`, `projectId`, `isActive` (`true`/`false`)

```bash
curl https://your-app/api/v1/subcontracts?limit=10 \
  -H "Authorization: Bearer ng_live_..."
```

```json
{
  "data": [
    {
      "id": "clx...",
      "reference": "SEED-SC-004",
      "description": "Cladding package",
      "contractForm": "SCHEME_DEFAULT",
      "contractSum": 340000,
      "retentionPct": 0.05,
      "retentionCap": null,
      "isActive": true,
      "project": { "id": "clx...", "name": "Elmwood Heights — Block B" },
      "subcontractor": {
        "id": "clx...",
        "name": "Cladwell Cladding Systems",
        "companyNumber": "12345678",
        "cisStatus": "verified"
      },
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-10T00:00:00.000Z"
    }
  ],
  "pagination": { "limit": 10, "offset": 0, "total": 1 }
}
```

## `GET /subcontracts/:id`

Single subcontract, plus its compliance documents and retention ledger.

```json
{
  "data": {
    "id": "clx...",
    "reference": "SEED-SC-004",
    "...": "same fields as the list endpoint",
    "subcontractor": {
      "id": "clx...",
      "name": "Cladwell Cladding Systems",
      "complianceDocuments": [
        {
          "id": "clx...",
          "documentType": "Public Liability",
          "status": "VALID",
          "issueDate": "2026-01-01T00:00:00.000Z",
          "expiryDate": "2027-01-01T00:00:00.000Z",
          "fileUrl": "https://...",
          "notes": null,
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    },
    "retentionLedger": {
      "totalHeld": 17000,
      "pcReleaseDate": "2026-09-01T00:00:00.000Z",
      "pcReleaseAmount": 8500,
      "pcReleasedAt": null,
      "mcdReleaseDate": null,
      "mcdReleaseAmount": null,
      "mcdReleasedAt": null
    }
  }
}
```

## `GET /cycles`

List payment cycles across your organisation, with each cycle's
application, assessment, and notice status nested inline.

**Query params:** `limit`, `offset`, `subcontractId`, `status` (one of
`AWAITING_APPLICATION`, `APPLICATION_RECEIVED`, `UNDER_ASSESSMENT`,
`NOTICE_SERVED`, `PAY_LESS_SERVED`, `PAID`, `CLOSED`)

```json
{
  "data": [
    {
      "id": "clx...",
      "cycleNumber": 1,
      "status": "NOTICE_SERVED",
      "applicationExpectedDate": "2026-06-25T00:00:00.000Z",
      "dueDate": "2026-07-02T00:00:00.000Z",
      "paymentNoticeDeadline": "2026-06-30T00:00:00.000Z",
      "finalDateForPayment": "2026-07-20T00:00:00.000Z",
      "payLessDeadline": "2026-07-13T00:00:00.000Z",
      "application": { "id": "clx...", "amountApplied": 62000, "dateReceived": "...", "receivedVia": "email", "attachmentUrl": null, "notes": null, "createdAt": "..." },
      "assessment": { "id": "clx...", "isLocked": true, "grossValuation": 62000, "retentionAmount": 3100, "previouslyCert": 0, "netThisCycle": 58900, "lastSavedAt": "..." },
      "paymentNotice": { "id": "clx...", "status": "SERVED", "sumDue": 58900, "basis": null, "servedAt": "...", "serviceMethod": "EMAIL" },
      "payLessNotice": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 13 }
}
```

## `GET /cycles/:id`

Single cycle — same shape as above, plus a `subcontract` object identifying
which subcontract/subcontractor it belongs to.

## `POST /cycles/:id/applications` — WRITE scope required

Log a payment application against a cycle that doesn't have one yet — the
API equivalent of a subcontractor's application being received (an
alternative to the inbound-email flow).

```bash
curl -X POST https://your-app/api/v1/cycles/CYCLE_ID/applications \
  -H "Authorization: Bearer ng_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "amountApplied": 62000,
    "dateReceived": "2026-06-25",
    "receivedVia": "xero",
    "notes": "Synced from Xero invoice #1042"
  }'
```

| Field | Type | Required |
|---|---|---|
| `amountApplied` | number ≥ 0 | yes |
| `dateReceived` | ISO date string | yes |
| `receivedVia` | string | no (defaults to `"api"`) |
| `notes` | string | no |
| `attachmentUrl` | string (URL) | no |

Returns `201` with the created application, `404` if the cycle doesn't
exist (or isn't yours), `409` if that cycle already has an application
logged.

## `POST /subcontracts/:id/compliance-documents` — WRITE scope required

Push a compliance document for the subcontractor behind this subcontract.
Upserts by `(subcontractor, documentType)` — posting the same
`documentType` again updates the existing record (e.g. a renewed
certificate) instead of creating a duplicate.

```bash
curl -X POST https://your-app/api/v1/subcontracts/ORDER_ID/compliance-documents \
  -H "Authorization: Bearer ng_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "Public Liability",
    "issueDate": "2026-01-01",
    "expiryDate": "2027-01-01",
    "fileUrl": "https://your-storage/cert.pdf"
  }'
```

| Field | Type | Required |
|---|---|---|
| `documentType` | string | yes |
| `issueDate` | ISO date string | no |
| `expiryDate` | ISO date string | no |
| `notes` | string | no |
| `fileUrl` | string (URL) | no |

`status` (`VALID`/`EXPIRING_SOON`/`EXPIRED`/`MISSING`) is computed
server-side from `issueDate`/`expiryDate` — you don't set it directly.
Returns `201` on create, `200` on update.

---

## Not yet available

This is a first pass covering the four data areas most useful for external
integrations (cycles/deadlines, applications/assessments, notices,
subcontracts/compliance). Not included yet, and worth asking for if you
need them: creating/editing subcontracts via API, variations, retention
release actions, and webhooks-out (NoticeGuard notifying *your* system on
events, e.g. for Zapier/Make-style automation, rather than you having to
poll). There's also no rate limiting yet — keep polling frequency
reasonable until that's added.
