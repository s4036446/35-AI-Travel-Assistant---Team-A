# Acceptance Criteria - AI Travel Assistant

**Flight-Data + Booking-Suggestion Flow**
Project: AI Travel Assistant for Accessible Aviation (Your Accessible Flight)
Prepared by: Wen Bin Liang (BA)

## 1. Scope

These criteria cover the chatbot flow described in the revised proposal: a user can find their flight either by entering a flight number directly, or by describing their trip in natural language (destination and approximate time), with the assistant matching candidate flights. Once a flight is identified, the assistant determines wheelchair compatibility directly using the user's registered equipment profile, and surfaces hotel suggestions via the client's own accessible-hotel data source, where listed properties are already vetted for accessibility

Criteria marked (Optional, time-permitting) are not required for the minimum Sprint 2 deliverable.

Each criterion is written to be checked off pass/fail during Sprint 2 QA, and specifies what the user should actually see, not internal system behavior.

## 2. Happy Path

**AC-1: Valid flight number returns route confirmation**
Given the user is in the chatbot
When they enter a valid, recognized flight number
Then the assistant displays the flight's origin and destination, the departure and arrival airports, and confirms it's ready to help with that flight.

**AC-2: Natural-language trip description returns candidate flights**
Given the user is in the chatbot
When they describe their destination and approximate departure time instead of a flight number
Then the assistant returns a list of matching flights across airlines, each showing the airline, flight number, and route/departure summary

**AC-3: User selects a candidate flight**
Given the assistant has displayed a list of candidate flights
When the user selects one of them
Then the assistant proceeds with that flight exactly as if the number had been entered directly, displaying its route and destination

**AC-4: User narrows down when their flight isn't in the candidate list**
Given the assistant has displayed a list of candidate flights, and the user's flight isn't among them
When the user provides their airline name or booking reference instead of selecting an option
Then the assistant returns an updated, narrower list of matching flights (or the single matching flight, if only one remains) based on that information

**AC-5: Loading state shown while data is retrieved**
Given the user has provided a flight number directly, or a natural-language trip description
When the assistant begins retrieving matching flight or aircraft data
Then the assistant displays a loading indicator until the response is ready

**AC-6: Wheelchair compatibility determined directly**
Given the assistant has identified the aircraft type for the user's flight, and the user has a single registered wheelchair/equipment profile
When the user asks whether their wheelchair can be taken on board
Then the assistant looks up the aircraft's cargo/baggage door data internally and states directly whether the registered equipment is allowed, rather than showing raw dimensions for the user to interpret

**AC-7: Multiple registered equipment requires disambiguation**
Given the user asks whether their equipment can be taken on board, and has more than one item registered on their profile
When the assistant checks their profile and finds multiple registered items
Then the assistant asks the user which item they mean before checking compatibility, rather than assuming or checking all items at once

**AC-8: Hotel suggestion returned for the destination**
Given the assistant has identified a valid destination
When the client's partner hotel network returns a result for that destination
Then the assistant displays at least one relevant hotel suggestion, including its accessibility information and a link to view or book it

**AC-9: Additional travel services suggested (Optional, time-permitting)**
Given the assistant has identified a valid destination
When the transfer or excursion provider returns a result for that destination
Then the assistant displays at least one relevant suggestion for that service

**AC-10: Full happy path, end-to-end**
Given the user provides a flight number or trip description
When the assistant identifies the flight, and the user separately asks about wheelchair compatibility and hotel suggestions in the same conversation
Then the user receives, across these exchanges: route confirmation, a direct wheelchair compatibility statement when asked, and at least one hotel suggestion near the destination when asked

## 3. Alternate Outcomes (system working correctly, result is negative)

**AC-11: Wheelchair is not compatible**
Given the assistant has the aircraft's accessibility data and the user's equipment profile
When the assistant compares the equipment against the aircraft's requirements and finds a mismatch (e.g. a liquid-battery restriction)
Then the assistant clearly states the equipment is not compatible and explains why

## 4. Edge Cases

**AC-12: Unrecognized flight number**
Given the user is in the chatbot
When they enter a flight number that is invalid, malformed, or not recognized by the flight-data provider
Then the assistant responds with a message prompting them to check and re-enter it, rather than showing an unhandled error or blank response

**AC-13: No matching flights found (natural-language path)**
Given the user is in the chatbot
When they describe a destination and time that returns no matching flights
Then the assistant tells them no matching flights were found and asks them to adjust the details, rather than showing a blank response

**AC-14: No wheelchair/equipment profile registered**
Given the user asks about wheelchair compatibility
When the assistant checks their profile and finds no equipment registered
Then the assistant tells them to add their equipment details in their profile first, rather than failing silently

**AC-15: No additional service results (Optional, time-permitting)**
Given the assistant has identified a valid destination
When the transfer or excursion provider returns no result for that destination
Then the assistant simply does not display that suggestion, without showing an error

**AC-16: API failure/timeout**
Given the user has provided a valid flight number or trip description
When the underlying flight or hotel data source fails to respond or times out
Then the assistant tells the user it's having trouble and to try again shortly, rather than showing an unhandled error

---
