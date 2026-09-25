# Mock Airline Dataset — Schema Reference

Sprint 2 Week 2 BA task: Build mock airline data + spec Selection Storage schema (closing Gap 2 from the Week 3 stress-test)

Prepared by: Wen Bin Liang (BA)

## 0. Usage: Where This Data Actually Lives

This JSON file and this doc are a readable reference and documentation copy, kept in the team's own repo for traceability. They are not consumed directly by any running code.

The airline compatibility check already reads from Postgres via an existing Go repository (`internal/airline/repository_postgres.go`), unlike hotels, there is no JSON-based mock provider mechanism for airlines. To actually make this data usable, the same values are provided as SQL `INSERT` statements in a companion file, `seed_mock_airlines.sql`, written in the same style as the client repo's own `db/seed.sql`.

`seed_mock_airlines.sql` is run locally only, against your own local Postgres instance (`docker compose up -d yaf-pg`), after the existing seed files. It never touches the client's real production database, nobody on the team has credentials for that yet, and there is no path from a local seed file to it.

## 1. Purpose

The client's real `airlines` table is placeholder-only in the local dev seed data (one row, Transavia). This blocks building and testing the equipment-compatibility check against a realistic range of airlines. This mock dataset (`mock-airlines-data.json`) stands in for that missing data during Sprint 2 development, until real production access is confirmed.

This mock dataset currently contains 8 airlines, expanding to 39 total records across the 4 populated tables (`airlines` (8), `airline_sub_rules` (8), `airline_equipment_rules` (16), `airline_equipment_battery_rules` (7))

## 2. Scope

Only the tables that directly feed the equipment-compatibility check are covered. Confirmed by checking the real `db/seed.sql`: `airline_contacts` and `airline_accessibility_info` are never populated there either, and aren't read by the compatibility check (`GetRuleByAirlineAndEquipmentType`), so they're intentionally excluded here.

| Real table                                      | Included in mock data?               | Why                                                                                                           |
| ----------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `airlines`                                      | Yes                                  | Core table this dataset exists to unblock                                                                     |
| `airline_sub_rules`                             | Yes (`sub_rule_0` only, per airline) | Required parent for `airline_equipment_rules`; real seed data also only uses one default sub-rule per airline |
| `airline_equipment_rules`                       | Yes                                  | Directly read by the compatibility check                                                                      |
| `airline_equipment_battery_rules`               | Yes                                  | Directly read by the compatibility check                                                                      |
| `airline_equipment_battery_spare_battery_rules` | Partial (one example)                | Real seed data also only includes one example, not full coverage                                              |
| `airline_contacts`                              | No                                   | Never seeded in the real repo; not read by the compatibility check                                            |
| `airline_accessibility_info`                    | No                                   | Never seeded in the real repo; not read by the compatibility check                                            |

## 3. Field Mapping: Mock JSON → Real Schema

### airlines

| Mock JSON field        | Real column            | Type         | Notes                                                                                                             |
| ---------------------- | ---------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `id`                   | `id`                   | VARCHAR(50)  | Used IATA-style 2-letter codes (e.g. `VJ`) rather than the numeric IDs the real seed uses, to stay human-readable |
| `airline_name`         | `airline_name`         | VARCHAR(255) | Plain string, not localized in the real schema                                                                    |
| `icon_url`             | `icon_url`             | TEXT         | Left null for all mock entries                                                                                    |
| `background_image_url` | `background_image_url` | TEXT         | Left null for all mock entries                                                                                    |

### airline_sub_rules

| Mock JSON field             | Real column     | Notes                                                                                                         |
| --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------- |
| `sub_rules[].id`            | `id`            | Always `sub_rule_0`, matching real seed pattern                                                               |
| `sub_rules[].name`          | `name`          | Real column is JSONB {en, ro}; kept as plain English string here for readability — Khanh to wrap when seeding |
| `sub_rules[].display_order` | `display_order` | Always 0                                                                                                      |

### airline_equipment_rules

| Mock JSON field                                    | Real column      | Notes                                                                                                                     |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `equipment_rules[].equipment_code`                 | `equipment_code` | Only existing frozen codes used: wheelchairManual, wheelchairElectric, walker, crutches, electricScooter, powerAttachment |
| `equipment_rules[].is_allowed`                     | `is_allowed`     | —                                                                                                                         |
| `max_length_cm` / `max_width_cm` / `max_weight_kg` | same columns     | max_height_cm omitted in most mock entries (real schema supports it; not populated in most real seed rows either)         |
| `positive_message` / `negative_message`            | same columns     | Real columns are JSONB {en, ro}; kept as plain English strings here                                                       |

### airline_equipment_battery_rules

| Mock JSON field                                                             | Real column         | Notes                                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `battery_rules[].for_equipment_code`                                        | (not a real column) | Used only in this mock file to link a battery rule to its parent equipment rule, since the mock data isn't relational. Real column is equipment_rule_id (an integer FK, assigned once rows are actually inserted) |
| `battery_rules[].battery_type_code`                                         | `battery_type_code` | Only existing frozen codes used: lithiumIon, nonSpillableNickelDry, nonSpillableWet, spillable                                                                                                                    |
| `max_single_wh` / `max_per_item_wh` / `max_count`                           | same columns        | —                                                                                                                                                                                                                 |
| `removable_positive` / `non_removable_attention` / `non_removable_negative` | same columns        | Real columns are JSONB {en, ro}; kept as plain English strings                                                                                                                                                    |

## 4. Sourcing & Assumptions

Every entry in the mock dataset carries its own `"source"` field, following the project's documentation standard of never silently inventing facts:

- Grounded in real, live-verified evidence: VJ (VietJet, operator of VJ82), MH (Malaysia Airlines, operator of MH2718), and JQ (Jetstar, operator of JQ499) are all airlines directly confirmed via live testing earlier in Sprint 1/2 (flight-lookup.js, schedule-lookup.js). QF, SQ, VA, and QR were all seen returned in a live schedule-lookup.js test (OOL→ADL).
- Matches real seed data exactly: the TO (Transavia) entry deliberately mirrors the real client seed.sql values verbatim, included as a consistency check that the mock data's shape matches the real thing precisely, not to be confused with the actual seeded row.
- All dimension, weight, and rule values not covered above are marked `"source": "assumed"`. plausible, but invented for testing purposes, not sourced from any real airline policy.

## 5. Compliance Notes

- No new equipment_types or battery_types codes introduced anywhere in this dataset, both tables are frozen (iOS has no fallback case for an unrecognized value).
- One deliberate "not compatible" example included (QF + electricScooter) to give AC-11 a concrete failure case to test against, alongside MH's spillable-battery restriction.

## 6. Next Steps

- Reviewed and agreed with Dev before use in Sprint 2 Week 2 development.
- To be swapped for real production data once client access is confirmed
