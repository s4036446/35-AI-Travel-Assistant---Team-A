# Usability Testing Template

Sprint 2 Week 2 BA task

Prepared by: Wen Bin Liang (BA)

## 1. Purpose

This template prepares what that testing will look like once the integrated build exists (Intent Router, Flight endpoint, and Selection Storage are all still in progress), so testing can start immediately rather than being designed from scratch later.

## 2. How to Use This Template

- For each row, act as the user and give the assistant exactly the input described in "Tester Input."
- Record what the assistant actually said/did in "Actual Output."
- Mark Pass if the actual output matches the expected behaviour, Fail if it doesn't, with a short note on what differed.
- Keep the same pass/fail/deferred format used in the Week 3 schema stress-test findings, for consistency across the project.
- If a new gap is found during testing (real integration behaviour, not just a schema-level issue), raise it to Khanh/Aindrila directly rather than only noting it here.

## 3. Test Scenarios (All 16 Acceptance Criteria)

| AC #  | Scenario                                    | Tester Input (as user)                                                                                                               | Expected Chatbot Output                                                                                                              | Actual Output | Pass/Fail |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- |
| AC-1  | Valid flight number entered                 | A valid, recognized flight number (e.g. "JQ499")                                                                                     | Flight's origin, destination, departure/arrival airports, and confirmation the assistant is ready to help with that flight           |               |           |
| AC-2  | Natural-language trip description           | Destination + approximate departure time (e.g. "flying to Melbourne around 6pm")                                                     | List of matching flights across airlines, each showing airline, flight number, and route/departure summary                           |               |           |
| AC-3  | Selecting a candidate flight                | Select one flight from a shown candidate list                                                                                        | Assistant proceeds with that flight exactly as if the number had been entered directly, showing its route and destination            |               |           |
| AC-4  | Narrowing an unmatched candidate list       | User's flight isn't in the list; provide airline name or booking reference instead                                                   | Updated, narrower list of matching flights (or the single match, if only one remains)                                                |               |           |
| AC-5  | Loading state while data is retrieved       | Flight number or trip description just submitted                                                                                     | Loading indicator shown until the response is ready                                                                                  |               |           |
| AC-6  | Wheelchair compatibility check              | "Can I bring my wheelchair on board?" (single equipment item registered)                                                             | Direct compatibility statement, based on the operating airline's rules and, where available, aircraft data (no raw dimensions shown) |               |           |
| AC-7  | Multiple registered equipment               | Same compatibility question, but user has more than one equipment item registered                                                    | Assistant asks which item is meant before checking compatibility                                                                     |               |           |
| AC-8  | Hotel suggestion                            | Destination already identified                                                                                                       | At least one hotel suggestion, with accessibility information and a link to view/book it                                             |               |           |
| AC-9  | Additional travel services                  | Destination identified; a transfer or excursion provider has a result                                                                | At least one relevant suggestion for that service                                                                                    |               |           |
| AC-10 | Full happy path, end-to-end                 | Flight number or trip description, then separately ask about wheelchair compatibility and hotel suggestions in the same conversation | Across the exchanges: route confirmation, a direct compatibility statement when asked, and at least one hotel suggestion when asked  |               |           |
| AC-11 | Wheelchair not compatible                   | Equipment that doesn't meet the airline's (or aircraft's) requirements (e.g. a liquid-battery wheelchair)                            | Assistant clearly states the equipment is not compatible and explains why                                                            |               |           |
| AC-12 | Unrecognized flight number                  | A flight number that's invalid, malformed, or not recognized                                                                         | Message prompting the user to check and re-enter it (no unhandled error or blank response)                                           |               |           |
| AC-13 | No matching flights (natural-language path) | A destination + time that returns no matching flights                                                                                | Assistant says no matching flights were found and asks the user to adjust the details                                                |               |           |
| AC-14 | No equipment profile registered             | Compatibility question asked, but no equipment registered on the profile                                                             | Assistant tells the user to add their equipment details in their profile first                                                       |               |           |
| AC-15 | No additional service results               | Destination identified; transfer/excursion provider returns no result                                                                | Suggestion simply isn't shown (no error displayed)                                                                                   |               |           |
| AC-16 | API failure/timeout                         | Valid flight number or trip description, but the flight or hotel data source fails or times out                                      | Assistant tells the user it's having trouble and to try again shortly (no unhandled error)                                           |               |           |

## 4. Notes

- AC-6 and AC-11 reflect the client's correction that compatibility uses both airline rules and, where available, aircraft data (not airline-only, matching the refined Requirements/AC docs.)
- AC-9 and AC-15 (additional services) are marked Optional, time-permitting per the AC doc's own scope note.
- This table only needs to be filled in once the integrated build exists.
