-- Mock airline data for local development — Sprint 2 Week 2 
--
-- This file is a LOCAL-ONLY addition. It runs against your own local Postgres
-- instance (docker compose up -d yaf-pg), the same way the existing seed.sql
-- populates the one real placeholder airline (Transavia, id '3'). It never
-- touches the client's real production database 
--
-- Run after the existing seed files, e.g.:
--   psql "$YAF_DB_URL" -f db/seed.sql
--   psql "$YAF_DB_URL" -f db/seed_mock_airlines.sql
--
-- Reference: mock-airlines-data.json and mock-airlines-schema-doc.md
-- (team repo, docs/Sprint 2/Week 2/BA/) document the sourcing and field
-- mapping for every value inserted here.
--
-- Safe to run repeatedly — every insert uses ON CONFLICT DO NOTHING.
-- Only existing, frozen equipment_types/battery_types codes are used;
-- no new enum rows are introduced by this file.

-- ── VJ — VietJet Air (operator of VJ82, live-tested Sprint 1/2) ─────────────

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('VJ', 'VietJet Air', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('VJ', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_weight_kg, positive_message, negative_message
)
VALUES
    ('VJ', 'sub_rule_0', 'wheelchairElectric', true, 115, 122, 150,
        jsonb_build_object('en', 'Electric wheelchair is allowed in cargo hold.'),
        jsonb_build_object('en', 'Electric wheelchair exceeds airline limits.')),
    ('VJ', 'sub_rule_0', 'wheelchairManual', true, 115, 122, 150,
        jsonb_build_object('en', 'Manual wheelchair is allowed in cargo hold.'), NULL)
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

INSERT INTO airline_equipment_battery_rules (
    equipment_rule_id, battery_type_code, max_single_wh, max_per_item_wh, max_count,
    removable_positive, non_removable_attention
)
SELECT r.id, 'lithiumIon', 300, 160, 2,
    jsonb_build_object('en', 'Battery can be carried in cabin if protected.'),
    jsonb_build_object('en', 'Battery must be disconnected and secured.')
FROM airline_equipment_rules r
WHERE r.airline_id = 'VJ' AND r.equipment_code = 'wheelchairElectric'
ON CONFLICT (equipment_rule_id, battery_type_code) DO NOTHING;

INSERT INTO airline_equipment_battery_spare_battery_rules (
    battery_rule_id, max_count, max_single_wh, max_per_item_wh, positive_message, negative_message
)
SELECT br.id, 2, 300, 160,
    jsonb_build_object('en', 'Spare batteries are allowed in the cabin if protected.'),
    jsonb_build_object('en', 'Spare battery exceeds airline limits.')
FROM airline_equipment_battery_rules br
JOIN airline_equipment_rules r ON r.id = br.equipment_rule_id
WHERE r.airline_id = 'VJ' AND r.equipment_code = 'wheelchairElectric' AND br.battery_type_code = 'lithiumIon'
ON CONFLICT DO NOTHING;

-- ── MH — Malaysia Airlines (operator of MH2718, live-tested Sprint 1 Week 2) ─

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('MH', 'Malaysia Airlines', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('MH', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_weight_kg, positive_message, negative_message
)
VALUES
    ('MH', 'sub_rule_0', 'wheelchairElectric', true, 113, 121, 155,
        jsonb_build_object('en', 'Electric wheelchair is allowed in cargo hold.'),
        jsonb_build_object('en', 'Electric wheelchair exceeds airline limits.')),
    ('MH', 'sub_rule_0', 'crutches', true, NULL, NULL, NULL,
        jsonb_build_object('en', 'Crutches are allowed in cabin free of charge.'), NULL)
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

-- Deliberate not-compatible example: spillable/liquid battery restriction (AC-11)
INSERT INTO airline_equipment_battery_rules (
    equipment_rule_id, battery_type_code, max_count, non_removable_negative
)
SELECT r.id, 'spillable', 0,
    jsonb_build_object('en', 'Spillable batteries must be removed and cannot travel on this aircraft; battery must always remain upright.')
FROM airline_equipment_rules r
WHERE r.airline_id = 'MH' AND r.equipment_code = 'wheelchairElectric'
ON CONFLICT (equipment_rule_id, battery_type_code) DO NOTHING;

INSERT INTO airline_equipment_battery_rules (
    equipment_rule_id, battery_type_code, max_single_wh, max_per_item_wh, max_count, removable_positive
)
SELECT r.id, 'lithiumIon', 300, 160, 2,
    jsonb_build_object('en', 'Battery can be carried in cabin if protected.')
FROM airline_equipment_rules r
WHERE r.airline_id = 'MH' AND r.equipment_code = 'wheelchairElectric'
ON CONFLICT (equipment_rule_id, battery_type_code) DO NOTHING;

-- ── JQ — Jetstar Airways (operator of JQ499, live-tested Sprint 2 Week 2) ───

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('JQ', 'Jetstar Airways', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('JQ', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_weight_kg, positive_message
)
VALUES
    ('JQ', 'sub_rule_0', 'wheelchairManual', true, 113, 121, 150,
        jsonb_build_object('en', 'Manual wheelchair is allowed in cargo hold.')),
    ('JQ', 'sub_rule_0', 'walker', true, NULL, NULL, NULL,
        jsonb_build_object('en', 'Walker is allowed in cabin free of charge.'))
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

-- ── QF — Qantas Airways (seen in live OOL→ADL schedule-lookup.js test) ─────

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('QF', 'Qantas Airways', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('QF', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_weight_kg, positive_message, negative_message
)
VALUES
    ('QF', 'sub_rule_0', 'wheelchairElectric', true, 120, 125, 160,
        jsonb_build_object('en', 'Electric wheelchair is allowed in cargo hold.'),
        jsonb_build_object('en', 'Electric wheelchair exceeds airline limits.')),
    -- Deliberate not-compatible example: outright disallowed equipment type (AC-11)
    ('QF', 'sub_rule_0', 'electricScooter', false, NULL, NULL, NULL, NULL,
        jsonb_build_object('en', 'Electric scooters are not currently accepted on this airline.'))
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

INSERT INTO airline_equipment_battery_rules (
    equipment_rule_id, battery_type_code, max_single_wh, max_per_item_wh, max_count, removable_positive
)
SELECT r.id, 'lithiumIon', 300, 160, 2,
    jsonb_build_object('en', 'Battery can be carried in cabin if protected.')
FROM airline_equipment_rules r
WHERE r.airline_id = 'QF' AND r.equipment_code = 'wheelchairElectric'
ON CONFLICT (equipment_rule_id, battery_type_code) DO NOTHING;

-- ── SQ — Singapore Airlines (seen in live OOL→ADL schedule-lookup.js test) ──

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('SQ', 'Singapore Airlines', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('SQ', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_weight_kg, positive_message
)
VALUES
    ('SQ', 'sub_rule_0', 'wheelchairManual', true, 115, 120, 150,
        jsonb_build_object('en', 'Manual wheelchair is allowed in cargo hold.')),
    ('SQ', 'sub_rule_0', 'powerAttachment', true, 110, 110, 100,
        jsonb_build_object('en', 'Power attachment is allowed in cargo hold.'))
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

INSERT INTO airline_equipment_battery_rules (
    equipment_rule_id, battery_type_code, max_single_wh, max_per_item_wh, max_count, removable_positive
)
SELECT r.id, 'nonSpillableNickelDry', 260, 260, 1,
    jsonb_build_object('en', 'Non-spillable battery accepted, no special handling required.')
FROM airline_equipment_rules r
WHERE r.airline_id = 'SQ' AND r.equipment_code = 'powerAttachment'
ON CONFLICT (equipment_rule_id, battery_type_code) DO NOTHING;

-- ── VA — Virgin Australia (seen in live OOL→ADL schedule-lookup.js test) ───

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('VA', 'Virgin Australia', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('VA', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_weight_kg, positive_message, negative_message
)
VALUES
    ('VA', 'sub_rule_0', 'wheelchairElectric', true, 113, 121, 150,
        jsonb_build_object('en', 'Electric wheelchair is allowed in cargo hold.'),
        jsonb_build_object('en', 'Electric wheelchair exceeds airline limits.'))
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

INSERT INTO airline_equipment_battery_rules (
    equipment_rule_id, battery_type_code, max_single_wh, max_per_item_wh, max_count, removable_positive
)
SELECT r.id, 'nonSpillableWet', 300, 160, 2,
    jsonb_build_object('en', 'Non-spillable wet battery accepted if securely packed.')
FROM airline_equipment_rules r
WHERE r.airline_id = 'VA' AND r.equipment_code = 'wheelchairElectric'
ON CONFLICT (equipment_rule_id, battery_type_code) DO NOTHING;

-- ── QR — Qatar Airways (seen in live OOL→ADL schedule-lookup.js test) ──────

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('QR', 'Qatar Airways', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('QR', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_weight_kg, positive_message
)
VALUES
    ('QR', 'sub_rule_0', 'wheelchairManual', true, 118, 123, 155,
        jsonb_build_object('en', 'Manual wheelchair is allowed in cargo hold.')),
    ('QR', 'sub_rule_0', 'crutches', true, NULL, NULL, NULL,
        jsonb_build_object('en', 'Crutches are allowed in cabin free of charge.'))
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

-- ── TO — Transavia mock double ──────────────────────────────────────────────
-- NOTE: id 'TO' is a DELIBERATE mismatch from the real seeded row (id '3').
-- This entry exists only to verify the mock data's shape matches the real
-- seed.sql values exactly, side by side with the real row — not a
-- replacement for it. Both 'TO' and the real '3' will exist locally after
-- running this file; that is expected.

INSERT INTO airlines (id, airline_name, icon_url, background_image_url)
VALUES ('TO', 'Transavia', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO airline_sub_rules (airline_id, id, name, subtitle, icon, display_order)
VALUES ('TO', 'sub_rule_0', jsonb_build_object('en', 'Default rules'), NULL, '', 0)
ON CONFLICT (airline_id, id) DO NOTHING;

INSERT INTO airline_equipment_rules (
    airline_id, sub_rule_id, equipment_code, is_allowed,
    max_length_cm, max_width_cm, max_height_cm, max_weight_kg, positive_message, negative_message
)
VALUES
    ('TO', 'sub_rule_0', 'wheelchairManual', true, 113, 121, 85, 150,
        jsonb_build_object('en', 'Manual wheelchair is allowed in cargo hold.'),
        jsonb_build_object('en', 'Manual wheelchair exceeds airline limits.')),
    ('TO', 'sub_rule_0', 'wheelchairElectric', true, 113, 121, 85, 150,
        NULL,
        jsonb_build_object('en', 'Electric wheelchair exceeds airline limits.')),
    ('TO', 'sub_rule_0', 'crutches', true, NULL, NULL, NULL, NULL,
        jsonb_build_object('en', 'Crutches are allowed in cabin free of charge.'), NULL)
ON CONFLICT (airline_id, sub_rule_id, equipment_code) DO NOTHING;

INSERT INTO airline_equipment_battery_rules (
    equipment_rule_id, battery_type_code, max_single_wh, max_per_item_wh, max_count,
    removable_positive, non_removable_attention
)
SELECT r.id, 'lithiumIon', 300, 160, 2,
    jsonb_build_object('en', 'Battery can be carried in cabin if protected.'),
    jsonb_build_object('en', 'Battery must be disconnected and secured.')
FROM airline_equipment_rules r
WHERE r.airline_id = 'TO' AND r.equipment_code = 'wheelchairElectric'
ON CONFLICT (equipment_rule_id, battery_type_code) DO NOTHING;
