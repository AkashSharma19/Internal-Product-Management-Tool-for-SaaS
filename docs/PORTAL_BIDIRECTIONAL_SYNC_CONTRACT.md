# ProductShip ↔ External Portal Synchronization Contract

**Status:** Proposed for team review
**Owners:** ProductShip team and External Portal team
**Scope:** ClickUp task links, ticket comments, workflow status, and deadlines
**ProductShip base URL:** `https://productship.coachlms.org`

## 1. Goal

A ticket shared between ProductShip and the External Portal must have the same ClickUp task link and discussion comments in both systems.

Required behavior:

1. When the External Portal adds, replaces, or clears a ClickUp link, ProductShip updates the matching ticket.
2. When ProductShip adds, replaces, clears, or creates a ClickUp task for an externally originated ticket, the External Portal updates the matching ticket.
3. When either system changes the ticket workflow status, the other system receives the equivalent status.
4. ProductShip's **Committed Date** (`committedDate`) and the Coach LMS `deadline` synchronize in both directions. Coach LMS `neededByDate` is informational in ProductShip and appears only as a Discussion comment; it must not populate any milestone.
5. When either system adds a discussion comment, the other system receives it exactly once.
6. Retries must not create duplicate tickets or comments.
7. Receiving an event must not cause the same event to echo indefinitely between systems.

## 2. Systems and terminology

| Term | Meaning |
|---|---|
| ProductShip | The application hosted at `productship.coachlms.org` |
| External Portal | The portal that currently sends `ticket_created` events |
| External ticket ID | The External Portal's stable ticket identifier, for example a UUID |
| ProductShip ticket ID | ProductShip's internal ID. Imported tickets currently use `productship:{externalTicketId}` |
| Discussion comment | A comment stored against the ticket in either portal |
| ClickUp comment | A comment stored directly on the linked ClickUp task |

### 2.1 Coach LMS tenancy and deployment constraints

Coach LMS is a multi-tenant white-label platform. `Organization` is the tenant root, and its backend scopes data by `organizationId`. ProductShip synchronization must therefore identify both the organization and the external ticket on every event.

Required rules:

- Add `organizationId` to every synchronization event. It is the authoritative tenant key.
- Add `brand` as an optional operational label such as `mastersunion`, `staging`, `tetr`, `coachlms`, or `aimer`.
- Never select an organization from an untrusted `Host`, `Origin`, `X-Forwarded-Host`, or client-supplied API hostname.
- Validate `organizationId` against a server-side allowlist or persisted integration mapping before applying an event.
- Resolve the External Portal API base URL and credentials from trusted per-organization configuration, preferably `OrganizationIntegration`, rather than from request payload fields.
- The same external ticket ID may exist in different organizations. Idempotency and database uniqueness must use `(organizationId, externalTicketId)`.
- The current ProductShip ID `productship:{externalTicketId}` is legacy behavior. The tenant-safe target format is `productship:{organizationId}:{environment}:{externalTicketId}`, with a migration/compatibility lookup for existing records.
- Coach Resume hostname-based `lmsTenant` routing is a separate feature and must not be reused as general webhook tenant resolution.

Known Coach LMS API deployments:

| Brand | API host | Proposed `brand` value |
|---|---|---|
| Masters' Union production | `api.mastersunion.in` | `mastersunion` |
| Staging | `api-dev.mastersunion.in` | `staging` |
| Tetr | `tetr.mastersunion.in` | `tetr` |
| CoachLMS / Ace Punjab | `api.coachlms.org` | `coachlms` |
| Aimer / ISBF | `aimer-api.mastersunion.in` | `aimer` |

The External Portal team must provide the organization IDs and confirm which environments should synchronize with ProductShip production.

## 3. Current state

The following behavior already exists in ProductShip:

- `POST /api/webhook` accepts authenticated `ticket_created` events.
- `Bug` maps to ProductShip type `BUG` and appears under **Requested Features → Bugs**.
- `Request` maps to `New Feature` and appears under **Requested Features → Feature Requests**.
- The initial `clickupLink` is saved when a ticket is first created.
- Imported ticket creation is idempotent using `productship:{externalTicketId}`.
- ProductShip can manually attach a ClickUp link or create a new ClickUp task.
- ProductShip can read comments from the linked ClickUp task.

The following behavior does not exist yet:

- Updating ProductShip when the External Portal changes a link after ticket creation.
- Sending ProductShip link changes to the External Portal.
- Synchronizing ProductShip workflow `status` with the External Portal's ticket status.
- Synchronizing ProductShip `committedDate` with Coach LMS `deadline` in both directions.
- Adding the External Portal's `neededByDate` to ProductShip Discussion as an idempotent informational comment without changing any milestone date.
- Exchanging discussion comments between portals.
- A configured External Portal callback URL in ProductShip.
- Stable cross-system comment identity and event deduplication.

## 4. Configuration and authentication

### 4.1 External Portal → ProductShip

**Endpoint**

```text
POST https://productship.coachlms.org/api/webhook
Content-Type: application/json
Authorization: Bearer <shared-secret>
```

ProductShip also accepts `x-productship-webhook-secret`, but `Authorization: Bearer` is the preferred format.

**Environment variables**

External Portal:

```env
PRODUCTSHIP_WEBHOOK_URL=https://productship.coachlms.org/api/webhook
PRODUCTSHIP_WEBHOOK_SECRET=<rotated-shared-secret>
```

ProductShip receiving environment:

```env
PRODUCTSHIP_WEBHOOK_SECRET=<same-rotated-shared-secret>
```

### 4.2 ProductShip → External Portal

The External Portal team must provide production and staging HTTPS endpoints for each participating organization. ProductShip must store endpoint and credential references in trusted per-organization configuration. A single environment variable may be used only for an initial one-organization rollout.

Proposed ProductShip configuration:

```env
COACHLMS_WEBHOOK_SECRET=<rotated-secret-from-private-channel>
COACHLMS_WEBHOOK_URLS_JSON={"77aa25d2-d52c-4c7b-ad4b-7b7de339fc4e:development":"https://api-dev.mastersunion.in/api/v1/feature-requests/productship/webhook","77aa25d2-d52c-4c7b-ad4b-7b7de339fc4e:production":"https://api.mastersunion.in/api/v1/feature-requests/productship/webhook"}
COACHLMS_WEBHOOK_TIMEOUT_MS=10000
```

`COACHLMS_WEBHOOK_URL` may be used only for a single-tenant rollout. Tetr production must be added to `COACHLMS_WEBHOOK_URLS_JSON` after its first authenticated `ticket_created` provides its `organizationId`.

Proposed request:

```text
POST <EXTERNAL_PORTAL_WEBHOOK_URL>
Content-Type: application/json
Authorization: Bearer <EXTERNAL_PORTAL_WEBHOOK_SECRET>
```

The two directions should use separate secrets. Secrets must be stored in the deployment platform or a secret manager. Do not commit them to Git, include them in payloads, or paste them into tickets and chat messages.

## 5. Common event envelope

All new synchronization events should use this envelope:

```json
{
  "schemaVersion": 1,
  "eventId": "9c7db246-e99b-4a6f-9487-d93894aab5c2",
  "event": "ticket_clickup_link_updated",
  "source": "external_portal",
  "organizationId": "org-coachlms-example",
  "brand": "coachlms",
  "occurredAt": "2026-11-05T07:00:00.000Z",
  "externalTicketId": "bb5c327a-d57a-4222-9126-ce41e7dbdfd2",
  "data": {}
}
```

| Field | Required | Rules |
|---|---:|---|
| `schemaVersion` | Yes | Integer. Start with `1` |
| `eventId` | Yes | Globally unique UUID generated once and reused for retries |
| `event` | Yes | One of the event names defined below |
| `source` | Yes | `productship` or `external_portal` |
| `organizationId` | Yes | Stable Coach LMS Organization ID; validated against trusted integration configuration |
| `brand` | No | Operational label only; never authoritative for tenant authorization |
| `occurredAt` | Yes | UTC ISO-8601 timestamp |
| `externalTicketId` | Yes | Stable External Portal ticket ID |
| `data` | Yes | Event-specific object |

## 6. ClickUp link synchronization

### 6.1 Event name

```text
ticket_clickup_link_updated
```

Use this event when a link is added, replaced, or cleared. Do not emit it when only ClickUp status or assignee changes.

### 6.2 Payload

```json
{
  "schemaVersion": 1,
  "eventId": "9c7db246-e99b-4a6f-9487-d93894aab5c2",
  "event": "ticket_clickup_link_updated",
  "source": "productship",
  "organizationId": "org-coachlms-example",
  "brand": "coachlms",
  "occurredAt": "2026-11-05T07:00:00.000Z",
  "externalTicketId": "bb5c327a-d57a-4222-9126-ce41e7dbdfd2",
  "data": {
    "clickupLink": "https://app.clickup.com/t/43314990/86d3ez5xg",
    "clickupTaskId": "86d3ez5xg",
    "changedBy": {
      "name": "Akash Sharma",
      "email": "akash@example.org"
    }
  }
}
```

To clear a link:

```json
{
  "data": {
    "clickupLink": null,
    "clickupTaskId": null,
    "changedBy": {
      "name": "Akash Sharma",
      "email": "akash@example.org"
    }
  }
}
```

### 6.3 Validation rules

- `clickupLink` must be `null` or an HTTPS ClickUp URL.
- `clickupTaskId` must be `null` when clearing the link.
- The task ID should be the final task segment in a URL such as `/t/{workspaceId}/{taskId}`.
- The receiver must locate the ticket by `externalTicketId`, not by title.
- A repeated `eventId` must return success without applying the update twice.

### 6.4 ProductShip behavior

When ProductShip receives this event:

1. Authenticate the sender.
2. Validate `organizationId` against trusted integration configuration.
3. Claim `(organizationId, eventId)` for idempotency.
4. Find the ticket by `(organizationId, externalTicketId)`, with a legacy prefixed-ID fallback during migration.
5. Update `taskLink` only if the incoming event is not stale.
6. Fetch ClickUp status/assignee metadata when a non-empty link is received.
7. Record that the change originated from `external_portal`.
8. Do not send the same event back to the External Portal.

When a user attaches or creates a ClickUp task in ProductShip:

1. Save the local link.
2. Create one durable outbound event.
3. Deliver it to the External Portal.
4. Retry transient failures using the same `eventId`.

### 6.5 External Portal behavior

The External Portal should implement the mirror behavior:

- Accept ProductShip's event using `(organizationId, externalTicketId)`.
- Set or clear the ticket's ClickUp link.
- Deduplicate by `(organizationId, eventId)`.
- Mark the origin as `productship` and do not echo it back.

## 7. Workflow status, release-date publishing, and needed-by comments

### 7.1 Canonical field mapping

| ProductShip field | External Portal field | Meaning |
|---|---|---|
| `status` | `status` | Ticket workflow status; synchronized in both directions |
| `committedDate` (Committed Date) | `deadline` | Synchronized in both directions; UTC midnight on the wire |
| No ProductShip milestone field | existing `neededByDate` | Imported as a ProductShip Discussion comment only |
| `clickupStatus` | No automatic mapping | Status read from ClickUp; keep separate from ticket workflow status |

**Important:** Coach LMS `neededByDate` must never populate a ProductShip milestone. ProductShip creates one Discussion comment in the format `Needed by date: DD Mon YYYY`. Coach LMS `deadline` is a separate synchronized field and maps to ProductShip `committedDate`.

### 7.2 Status event

Event name:

```text
ticket_status_updated
```

Payload:

```json
{
  "schemaVersion": 1,
  "eventId": "c97b44e2-2ef1-43ab-b7f9-10de3bd65f24",
  "event": "ticket_status_updated",
  "source": "external_portal",
  "occurredAt": "2026-11-05T07:10:00.000Z",
  "externalTicketId": "bb5c327a-d57a-4222-9126-ce41e7dbdfd2",
  "data": {
    "status": "In Progress",
    "changedBy": {
      "name": "Tarun Gupta",
      "email": "tarun@example.org"
    }
  }
}
```

Requirements:

- Status synchronization is bidirectional.
- The receiver must resolve the ticket using `externalTicketId`.
- Imported status changes must not be emitted back to their source.
- A repeated `eventId` must be acknowledged without applying the update again.
- ProductShip status values are configurable. Both teams must agree on the mapping below before enabling production synchronization.

| ProductShip status | External Portal status | Confirmed? |
|---|---|---:|
| `On Hold` | `________________` | [ ] |
| `In Progress` | `________________` | [ ] |
| `Ongoing` | `________________` | [ ] |
| `Completed` | `________________` | [ ] |
| Other configured value: `________` | `________________` | [ ] |

Unknown status values must return `400` rather than silently creating a status that is hidden or invalid in either portal.

### 7.3 Committed Date ↔ Coach LMS deadline event

Event name:

```text
ticket_deadline_updated
```

Payload sent when ProductShip Committed Date or Coach LMS deadline changes:

```json
{
  "schemaVersion": 1,
  "eventId": "39ffd888-496b-429c-b90e-18d45ea0bb20",
  "event": "ticket_deadline_updated",
  "source": "productship",
  "occurredAt": "2026-11-05T07:15:00.000Z",
  "externalTicketId": "bb5c327a-d57a-4222-9126-ce41e7dbdfd2",
  "data": {
    "deadline": "2026-11-30T00:00:00.000Z",
    "changedBy": {
      "name": "Akash Sharma",
      "email": "akash@example.org"
    }
  }
}
```

To clear the deadline:

```json
{
  "data": {
    "deadline": null,
    "changedBy": {
      "name": "Akash Sharma",
      "email": "akash@example.org"
    }
  }
}
```

Requirements:

- ProductShip `committedDate` ↔ Coach LMS `deadline`.
- Both directions use `ticket_deadline_updated`; inbound values update `committedDate`, outbound values originate from `committedDate`.
- Coach LMS `neededByDate` → one ProductShip Discussion comment only.
- No ProductShip milestone, including Dev Date and Release Date, may be populated by `neededByDate`.
- Use ISO-8601 UTC midnight on the wire.
- `null` explicitly clears the synchronized Committed Date/deadline; omission means no change.
- Older events are acknowledged as stale; equal timestamps with different values return `409`.
- Existing and new `ticket_created` payloads must create at most one `Needed by date: DD Mon YYYY` Discussion comment.
- On a retry, ProductShip may remove a legacy Dev Date only when its stored raw value exactly equals the same incoming `neededByDate`; independently edited Dev Dates must be preserved.

## 8. Comment synchronization

### 8.1 Recommended scope decision

**Recommended MVP:** synchronize **External Portal comments ↔ ProductShip Discussion comments**.

ClickUp task comments should remain in the separate **ClickUp Comments** tab for the first version. Synchronizing all three systems requires additional ClickUp comment identity mapping and can cause duplicate messages when the same comment travels through multiple paths.

External Portal team decision:

- [ ] Accept recommended two-system discussion sync.
- [ ] Require comments to also be created in ClickUp. If selected, provide the desired source-of-truth and deletion/edit rules.

### 8.2 Event name

```text
ticket_comment_created
```

### 8.3 Payload

```json
{
  "schemaVersion": 1,
  "eventId": "aa6e2247-268f-4296-828c-f7808dded3c7",
  "event": "ticket_comment_created",
  "source": "external_portal",
  "occurredAt": "2026-11-05T07:05:00.000Z",
  "externalTicketId": "bb5c327a-d57a-4222-9126-ce41e7dbdfd2",
  "data": {
    "comment": {
      "externalCommentId": "comment-90327",
      "content": "The ClickUp task has been created.",
      "author": {
        "name": "Tarun Gupta",
        "email": "tarun@example.org"
      },
      "createdAt": "2026-11-05T07:04:58.000Z"
    }
  }
}
```

### 8.4 Validation rules

- `externalCommentId`, `content`, `author.name`, and `createdAt` are required.
- `content` is plain text for version 1, with a proposed maximum of 10,000 characters.
- `author.email` may be empty but must be valid when provided.
- The receiver must deduplicate by `(source, externalCommentId)` and by `eventId`.
- The original author and original timestamp must be preserved.

### 8.5 Loop prevention

When a system imports a comment:

1. Persist its `source`, `externalCommentId`, and `originEventId`.
2. Display it as a normal discussion comment with its original author.
3. Do not generate an outbound event back to the same source.
4. If another delivery arrives with the same event or comment ID, acknowledge it without inserting another comment.

A comment created locally should generate exactly one outbound event after the local database save succeeds.

### 8.6 Comment edits and deletes

Comment edits and deletes are outside the MVP unless both teams agree on the following additional events:

```text
ticket_comment_updated
ticket_comment_deleted
```

Until then, synchronized comments should be treated as immutable. Local deletion of an imported comment should either be disabled or remain local-only. The teams must choose one behavior before implementation.

## 9. Response contract

### Successful first processing

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "success": true,
  "eventId": "9c7db246-e99b-4a6f-9487-d93894aab5c2",
  "processed": true,
  "alreadyProcessed": false
}
```

### Successful duplicate delivery

```json
{
  "success": true,
  "eventId": "9c7db246-e99b-4a6f-9487-d93894aab5c2",
  "processed": false,
  "alreadyProcessed": true
}
```

### Error responses

| HTTP status | Meaning | Sender behavior |
|---:|---|---|
| `400` | Invalid or unsupported payload | Do not retry until corrected |
| `401` | Missing or invalid credential | Do not retry until configuration is corrected |
| `404` | `externalTicketId` not found | Reconcile ticket creation before retrying |
| `409` | Stale/conflicting update | Fetch current state and reconcile |
| `429` | Rate limited | Retry after `Retry-After` |
| `500–599` | Temporary receiver failure | Retry with backoff |

The receiver should always return JSON with `success` and a safe error message. Responses must not include secrets or stack traces.

## 10. Retry and delivery requirements

- Connection timeout: 5 seconds.
- Total request timeout: 15 seconds.
- Retry only `429` and `5xx` responses, plus network timeouts.
- Suggested retry intervals: 30 seconds, 2 minutes, 10 minutes, 30 minutes, then hourly up to 24 hours.
- Reuse the original `eventId` for every retry.
- Store failed outbound deliveries so operators can inspect and replay them.
- Do not block a user's local save while waiting for the remote portal.

## 11. Conflict rules

Proposed version 1 behavior:

1. Each system stores the latest accepted `occurredAt` independently for the ClickUp link, workflow status, and committed-date/deadline fields.
2. An older event must not overwrite a newer value for the same synchronized field.
3. If timestamps or revisions are equal but synchronized values differ, return `409` and require reconciliation.
4. Link clearing is an explicit update using `null`; an omitted field means no change.
5. ProductShip `committedDate` and Coach LMS `deadline` are one bidirectional field. Coach LMS `neededByDate` remains a Discussion comment only.
6. ProductShip `status` and External Portal `status` use the approved mapping table. `clickupStatus` remains independent.
7. Comments are append-only and identified by immutable source IDs.

If the External Portal already has numeric record revisions, the team should provide them. A revision number is preferred over timestamp-only conflict handling.

## 12. Data model changes required in ProductShip

Proposed additions to tickets:

```text
externalSource
organizationId
brand
externalTicketId
clickupTaskId
clickupLinkUpdatedAt
clickupLinkUpdatedBySource
statusUpdatedAt
statusUpdatedBySource
committedDateUpdatedAt
committedDateUpdatedBySource
```

Proposed additions to comments:

```text
source
externalCommentId
originEventId
sourceCreatedAt
syncStatus
```

Proposed synchronization records:

```text
WebhookInbox: eventId, source, receivedAt, processedAt, result
WebhookOutbox: eventId, destination, event, payload, attempts, nextAttemptAt, deliveredAt, lastError
```

Required unique indexes:

```text
Ticket: (externalSource, organizationId, externalTicketId)
Comment: (source, organizationId, externalCommentId)
WebhookInbox: (organizationId, eventId)
WebhookOutbox: (organizationId, eventId)
```

## 13. External Portal team checklist

Please complete and return this section.

### Endpoint and authentication

- Production inbound URL for ProductShip events: `______________________________`
- Staging inbound URL: `______________________________`
- Preferred auth header: `Authorization: Bearer` / Other: `____________`
- Secret provisioning owner: `______________________________`
- Maximum accepted request size: `______________________________`

### Tenant and environment mapping

- Production organizations that should sync: `______________________________`
- Staging organizations that should sync: `______________________________`
- `organizationId` values and brand mapping:

| Environment | Brand | API host | Organization ID | Sync enabled? |
|---|---|---|---|---:|
| Production | Masters' Union | `api.mastersunion.in` | `____________` | [ ] |
| Staging | Staging | `api-dev.mastersunion.in` | `____________` | [ ] |
| Production | Tetr | `tetr.mastersunion.in` | `____________` | [ ] |
| Production | CoachLMS / Ace Punjab | `api.coachlms.org` | `____________` | [ ] |
| Production | Aimer / ISBF | `aimer-api.mastersunion.in` | `____________` | [ ] |

- Confirm inbound events include `organizationId`: Yes / No
- Confirm backend resolves integration URL/credentials from `OrganizationIntegration`: Yes / No
- Confirm payload `brand`, host, and forwarded-host headers are not used as authorization: Yes / No

### Ticket identity

- Is `externalTicketId` permanent? Yes / No
- Can a ticket be merged or replaced? Yes / No
- Can the External Portal accept link updates by `externalTicketId`? Yes / No
- Does the portal support a revision/version number? Yes / No
- Revision field name, if available: `______________________________`

### Link behavior

- Can users clear an existing ClickUp link? Yes / No
- Which system wins a simultaneous link conflict? `______________________________`
- Event emitted by the portal when a link changes: `______________________________`

### Status and deadline behavior

- External Portal status field name: `______________________________`
- Event emitted when status changes: `______________________________`
- Complete and approve the ProductShip ↔ External Portal status mapping in Section 7.2.
- Coach LMS deadline field synchronized with ProductShip Committed Date: `deadline`
- Event used in both directions: `ticket_deadline_updated`
- Confirm ProductShip **Committed Date (`committedDate`)** ↔ Coach LMS deadline: Yes / No
- Confirm Coach LMS `neededByDate` becomes only a ProductShip Discussion comment: Yes / No
- Confirm `neededByDate` does not populate any ProductShip milestone: Yes / No
- Which system wins a simultaneous status conflict? `______________________________`
- Confirm equal-time different deadline values return `409`: Yes / No

### Comment behavior

- Portal comment ID field: `______________________________`
- Are comment IDs permanent? Yes / No
- Are comments plain text, Markdown, or HTML? `______________________________`
- Should edits synchronize? Yes / No
- Should deletes synchronize? Yes / No
- Should comments also be posted to ClickUp? Yes / No
- Event emitted by the portal for new comments: `______________________________`

### Existing implementation

- Link-update payload example:

```json
{}
```

- Status-update payload example:

```json
{}
```

- Deadline-update payload example:

```json
{}
```

- Comment-created payload example:

```json
{}
```

- Success response example:

```json
{}
```

- Retry policy: `______________________________`

## 14. Acceptance-test matrix

| Scenario | Expected result |
|---|---|
| Portal creates Bug with a ClickUp link and valid `organizationId` | ProductShip creates one Bug in the correct tenant and displays the link |
| Portal creates Request with a ClickUp link and valid `organizationId` | ProductShip creates one New Feature in the correct tenant and displays the link |
| Same `externalTicketId` arrives for two organizations | Two tenant-isolated tickets are created; neither overwrites the other |
| Event has missing or unknown `organizationId` | Receiver rejects it without writing data |
| Payload brand/host conflicts with trusted organization mapping | Trusted organization mapping wins or the event is rejected |
| Portal retries ticket creation | No duplicate ticket |
| Portal adds a link after creation | ProductShip displays the new link |
| Portal replaces a link | ProductShip displays only the replacement link |
| Portal clears a link | ProductShip clears link and ClickUp metadata |
| ProductShip manually adds a link | External Portal displays it |
| ProductShip creates a ClickUp task | External Portal receives and displays the generated link |
| ProductShip retries link delivery | External Portal applies it once |
| Portal creates a ticket with `neededByDate` | ProductShip creates one Discussion comment and leaves every milestone date empty/unchanged |
| Portal retries the same ticket with `neededByDate` | ProductShip does not create a duplicate needed-by comment |
| Legacy imported ticket has Dev Date equal to the retried `neededByDate` | ProductShip removes that legacy Dev Date and preserves the comment |
| Existing Dev Date differs from incoming `neededByDate` | ProductShip preserves the independently edited Dev Date |
| ProductShip changes Committed Date | Coach LMS updates its deadline |
| Coach LMS changes deadline | ProductShip updates Committed Date |
| Either side clears Committed Date/deadline | The other side clears the mapped field |
| Portal changes workflow status | ProductShip applies the approved mapped status |
| ProductShip changes workflow status | External Portal applies the approved mapped status |
| ClickUp status changes | It does not overwrite either portal's workflow status unless separately approved |
| Either side retries status/deadline delivery | Receiver applies the event once |
| Portal posts a comment | ProductShip Discussion displays it once with original author/time |
| ProductShip posts a comment | External Portal displays it once with original author/time |
| Either side retries a comment event | No duplicate comment |
| Imported event is processed | It is not echoed back to its origin |
| Invalid secret is used | Receiver returns `401` and performs no write |
| Unknown ticket ID is used | Receiver returns `404` and performs no write |

## 15. Rollout plan

1. Rotate the previously exposed webhook secret.
2. Configure the rotated inbound secret in both deployments.
3. External Portal team completes Section 13, supplies the organization/brand mapping, and confirms the proposed payloads and status mapping.
4. Implement tenant-safe identity and idempotency using `(organizationId, externalTicketId)` and `(organizationId, eventId)`.
5. Ensure `ticket_created.neededByDate` creates one ProductShip Discussion comment and does not populate any milestone date.
6. Implement and test inbound link and status events in ProductShip staging.
7. Implement and test outbound link, status, comment, and Committed Date events against Coach LMS staging.
8. Implement discussion-comment events and deduplication.
9. Run every acceptance test in Section 14.
10. Enable production delivery for one organization and one test ticket.
11. Monitor webhook failures, tenant mismatches, conflicts, and duplicate counts for 24 hours.
12. Enable production delivery organization by organization.

## 16. Decisions required before implementation

The teams must confirm:

1. The External Portal callback URLs and authentication format for each participating organization/environment.
2. The authoritative `organizationId` values and brand mapping.
3. Whether the proposed event names and envelope are accepted.
4. The exact bidirectional workflow-status mapping.
5. Confirmation that ProductShip `committedDate` and Coach LMS `deadline` synchronize bidirectionally, while `neededByDate` creates only a ProductShip Discussion comment.
6. Whether comments synchronize only between the two portals or also with ClickUp.
7. Whether comment edits/deletes are in scope.
8. The conflict rule for link, status, and committed-date/deadline fields.
9. How a ticket created first in ProductShip receives an External Portal ticket ID and organization ID, if that workflow is required.
