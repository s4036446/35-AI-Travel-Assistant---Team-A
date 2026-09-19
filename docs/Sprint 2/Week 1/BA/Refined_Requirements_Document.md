# Requirements: AI Travel Assistant

AI Travel Assistant for Accessible Aviation: External Travel Services, Booking & Flight Data Integration

Project: AI Travel Assistant for Accessible Aviation (Your Accessible Flight)

Prepared by: Daniel Francisco (PM)

Note on scope: an earlier requirements draft this term scoped the core Sprint 2 feature as the Staff QR Scan flow, and explicitly listed the accessible trip-planning "story" feature (hotels, sightseeing, transfers, excursions, rental/repair) as future/out-of-scope. This document proposes replacing that direction with the trip-planning feature described below, based on further client discussion. This change has not yet been formally re-confirmed with the client and should be signed off before Sprint 2 development begins.

## 1. Problem Statement

Travelers with disabilities face a fragmented experience when planning and taking a trip: flights, aircraft information, hotels, transfers, excursions, mobility rental and repair services, and accessibility information are currently spread across many different platforms, with no single place bringing this together in an accessibility-aware way. Your Accessible Flight (YAF) already has an AI Assistant, alongside internal aviation, accessibility, and mobility-equipment data. This project extends that assistant so a traveler can plan their journey, from flight to destination to services in one place, rather than researching each piece separately.

## 2. Target Users

Primary: Travelers with disabilities, and their caregivers or travel companions. They need a single, accessibility-aware place to plan flights, accommodation, transfers, and activities.

Secondary: Airport, airline, and ground-handling staff. They benefit where relevant, but are not the main focus of this project.

## 3. What Already Exists

YAF already has, and this project extends rather than rebuilds:

- A passenger-facing application
- Wheelchair and mobility-equipment profiles
- Airline-specific wheelchair and battery verification
- QR code sharing functionality: passengers can generate a QR code with trip and equipment information, shareable with staff
- An AI Assistant
- Internal aviation, accessibility, and mobility-equipment information

## 4. Proposed Solution

We propose extending the existing YAF AI Assistant so it can combine YAF's own accessibility and aviation data with live external travel information. Given a flight number, the assistant will identify the route, destination and aircraft type, check that flight against YAF's internal accessibility data (the operating airline's mobility-aid and battery rules), and, where aircraft information is available, the aircraft's cargo/baggage door dimensions, and return a compatibility outcome, and then surface relevant external services, starting with at least one real hotel/booking provider for accommodation near the destination.

### 4.1 Scenario: flight number

User enters a flight number → YAF identifies the flight, route, destination and aircraft → aircraft type is matched with YAF internal data, including relevant aircraft/cargo-door information → YAF understands the user's destination → AI Assistant retrieves or uses relevant hotels, transfers, excursions or other accessible travel services → user receives an aggregated, accessibility-focused response and can continue to the relevant external service or booking flow.

### 4.2 Error Handling & Degraded States

The assistant must stay usable and informative when a step fails or data is missing, rather than showing a blank response or an unhandled error:

- A loading indicator is shown while flight, accessibility, or hotel data is being retrieved.
- An invalid or unrecognized flight number prompts the user to re-enter it, with a clear message.
- If no accessibility match exists for the identified aircraft type, the assistant still returns the route/destination information and says the accessibility data isn't available yet, rather than omitting the whole response.
- If a hotel is found but has no usable booking link, the assistant still shows the hotel and its accessibility information, and says a direct link isn't available.
- If the flight-data or hotel-provider API fails or times out (target: within 10 seconds), the assistant tells the user it's having trouble and to try again shortly.

## 5. Scope Boundaries

### 5.1 In scope

- YAF AI Travel Assistant extension
- External travel-data integration
- Flight-data integration: flight-number recognition, route and destination identification, aircraft-type identification
- Connection with YAF internal aircraft/accessibility data
- Hotel / accommodation integration, with booking-service integration
- At least one working external API/provider integration

### 5.2 Out of scope

- Rebuilding the existing passenger application
- Rebuilding the existing QR functionality
- Rebuilding the existing wheelchair/battery verification
- Developing a separate Staff QR application as the main deliverable
- Integrating every travel provider available

## 6. Minimum Expected Project Result

By the end of the project, we would like to see a working prototype demonstrating: flight/destination data + YAF internal information + at least one real external travel/booking provider + AI Assistant response. Additional services such as transfers, excursions, rentals, repairs and additional booking providers can be added depending on technical feasibility and available time.

## 7. Assumptions & Dependencies

- Flight data will be sourced from AeroDataBox (selected after comparing four providers on coverage, aircraft-type detail, and cost — see the Flight-Data API Access research). Its free tier is limited to 600 API units/month and 1 request/second, shared across the whole team; this may constrain how much live testing can happen close to demos.
- If the client already holds a Flightradar24 subscription or API key, that could be revisited as an alternative provider; this is an open item to confirm with the client.
- Compatibility matching relies on YAF's internal airline mobility-aid/battery rules, and, where available, the aircraft/cargo-door dataset (manufacturer, model, cargo door width/height, weight limitation) being populated for the aircraft types returned by the flight-data provider; coverage gaps are handled per section 4.2.
- At least one hotel/booking provider offering a real, callable API within a free or low-cost tier is available and selected before development begins.

## 8. Non-Functional Considerations

- Response time: the assistant should indicate progress (loading state) for any request that cannot complete quickly, and should time out and inform the user rather than hang indefinitely (target ceiling: 10 seconds per external call).
- Data privacy: trip, accessibility, and mobility-equipment information is sensitive personal data. Any external service information stored against a user's trip should be handled with the same care as existing YAF passenger data, and only the minimum needed to answer follow-up questions should be retained.
- Reliability under shared API limits: because the recommended flight-data free tier is shared across the team, usage should be monitored during development and testing so the prototype doesn't run out of quota before a demo.

## 9. Success Criteria

- Given a real, valid flight number, the assistant returns the correct route, destination, and aircraft type.
- Given the operating airline and, where available, the aircraft type, the assistant's response includes the resulting compatibility outcome (e.g. compatible, not compatible, or compatible with a note), without exposing the underlying dimensions.
- For the identified destination, the assistant returns at least one real hotel suggestion, including accessibility information and a link to view or book it.
- None of the failure conditions in section 4.2 produce a blank response or an unhandled error during Sprint 2 QA.

## 10. Open Questions for Client Confirmation

- Sign-off on replacing the Staff QR Scan feature with this trip-planning feature as the Sprint 2 focus (see Note on scope, page 1).
- Does YAF already hold a Flightradar24 subscription/API key that could be used instead of, or alongside, AeroDataBox?
- Is there an existing trip/session data model in YAF that external services should be attached to, or does this project need to define one?
- Which hotel/booking provider does the client want prioritised for the first integration, if they have an existing preference or partnership?
