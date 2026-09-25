# Selection Storage - Schema Spec

Sprint 2 Week 2 BA task: spec Selection Storage schema for Khanh to build against (closing Gap 1 from the Week 3 stress-test)

Prepared by: Wen Bin Liang (BA).

## 1. Purpose

The client's own architecture docs confirm the chatbot is currently stateless "the backend treats each chat request as standalone." There is no table anywhere for a flight, trip, or conversation. This means the chatbot cannot currently remember a candidate flight list it just showed a user, or which flight the user selected, across separate messages. This blocks AC-3, AC-4, and AC-10, which all depend on that memory existing.

This table is what the Intent Router, Flight endpoint, Equipment Checking, and Hotel lookup all read from and write to, so a multi-turn conversation ("here's your flight" → "can I bring my wheelchair" → "any hotels nearby") works without the user repeating themselves.

## 2. Proposed Table

```sql
CREATE TABLE ai_flight_selections (
    id             BIGSERIAL PRIMARY KEY,
    tenant_id      BIGINT NOT NULL REFERENCES tenants(id),
    user_id        VARCHAR(128) NOT NULL REFERENCES app_users(uid) ON DELETE CASCADE,
    status         VARCHAR(20) NOT NULL DEFAULT 'searching',
    search_input   JSONB,
    candidate_flights JSONB,
    selected_flight   JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ai_flight_selections_tenant_user_idx
    ON ai_flight_selections (tenant_id, user_id);
```

Named under the `ai_` prefix Khanh already flagged as free to use for new tables, and follows the existing `tenant_id` + `user_id` scoping pattern used elsewhere in the schema (e.g. `user_equipment`).

## 3. Field Descriptions

| Field                   | Type              | Purpose                                                                                                                                                |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                      | BIGSERIAL         | Primary key                                                                                                                                            |
| tenant_id               | BIGINT (FK)       | Scopes the row to a tenant, consistent with the rest of the schema's multi-tenancy pattern                                                             |
| user_id                 | VARCHAR(128) (FK) | Scopes the row to one user; cascades on user delete, matching user_equipment                                                                           |
| status                  | VARCHAR(20)       | One of: searching, candidates_shown, selected: tracks where the conversation is at                                                                     |
| search_input            | JSONB             | What the user provided: either a flight number, or a destination + approximate time                                                                    |
| candidate_flights       | JSONB             | The list of candidate flights shown to the user (natural-language path only; empty for direct flight-number entry)                                     |
| selected_flight         | JSONB             | The resolved flight once identified — flight number, operating airline, route, destination. This is what Equipment Checking and Hotel lookup read from |
| created_at / updated_at | TIMESTAMPTZ       | Standard audit timestamps, matching existing tables                                                                                                    |

## 4. How Each Path Writes to This Table

| Path                                      | What happens                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Direct flight-number entry (AC-1)         | Flight resolved immediately → one row written with status = selected, selected_flight populated, candidate_flights left empty |
| Natural-language search (AC-2)            | Candidate list returned → one row written with status = candidates_shown, candidate_flights populated                         |
| User selects from candidate list (AC-3)   | Same row updated: status = selected, selected_flight populated from the chosen candidate                                      |
| User narrows an unmatched list (AC-4)     | Same row updated: candidate_flights replaced with the narrower list, status stays candidates_shown                            |
| Later message "can I bring my wheelchair" | Equipment Checking reads selected_flight.airline_id from the most recent row for this user                                    |
| Later message "any hotels nearby"         | Hotel lookup reads selected_flight.destination from the most recent row for this user                                         |

## 5. Open Questions for Khanh

- One row per user (always updated in place), or one row per search session (a new row each time)? This spec assumes update-in-place for simplicity, but worth confirming against how the Intent Router is being built.
- Does a row ever need to expire (e.g. an old, abandoned search), or is that out of scope for this sprint?
- Should candidate_flights and selected_flight be typed structs at the Go level (matching the Flight endpoint's own response shape), or kept as loosely-typed JSONB indefinitely? Recommend matching whatever shape the Flight endpoint already returns, to avoid a second definition of the same data.

## 6. Assumptions

- JSONB used for search_input, candidate_flights, and selected_flight rather than separate relational tables — keeps this table simple and avoids over-designing before real usage patterns are known. Can be normalised later if needed.
