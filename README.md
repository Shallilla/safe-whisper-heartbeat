# Safety Check

Build a fully functional MVP web application called Lifeline.

PRODUCT

Lifeline is a personal safety application designed for situations where a person may be unable to ask for help.

Core idea:

Help when you need it — even when you can't ask for it.

The MVP should demonstrate this complete flow:

Detect → Check → Escalate → Locate → Respond

This is NOT just a landing page or prototype. Build a working application with real interactions, persistent data, authentication, database storage, timers, emergency states, and an emergency-contact dashboard.

For the MVP, emergency services should be simulated rather than actually contacting police or ambulances.

1. TECH STACK

Use:

React

TypeScript

Tailwind CSS

Supabase for authentication and database

Browser Geolocation API for location

Browser Notifications API where supported

Lucide icons

Responsive design for desktop and mobile

Keep the architecture clean and modular.

2. USERS

There are two types of users:

Person

The person using Lifeline to protect themselves.

Emergency Contact

A trusted person who receives alerts when something may be wrong.

For the MVP, allow a user to create an emergency contact using a name, phone number and email.

The emergency contact dashboard can be accessed through a simple demo account or a generated emergency-access link.

Do not require real SMS/email infrastructure for the MVP.

Instead, show alerts inside the application and create an emergency event in the database.

3. MAIN APP STRUCTURE

Create these pages:

/

Landing / welcome page

/auth

Login / signup

/dashboard

Main Lifeline dashboard

/check-in

Safety check-in interface

/emergency

Emergency mode

/contacts

Emergency contacts

/history

Previous safety events

/settings

Safety settings

/responder

Emergency responder/contact dashboard

4. LANDING PAGE

Create a simple, serious, trustworthy landing page.

Headline:

Help when you need it. Even when you can't ask for it.

Subheading:

Lifeline helps detect when something may be wrong, checks if you're safe, and alerts the people who can help.

Primary CTA:

Get started

Secondary CTA:

See how it works

Explain the three main use cases:

Living Alone

If something happens while you're alone, Lifeline can check on you and escalate if you don't respond.

Traveling Alone

Set a destination and expected return time. Lifeline can monitor your safety status.

Emergency

Trigger an emergency manually or allow Lifeline to escalate a missed safety check.

5. DASHBOARD

The dashboard should immediately communicate whether the person is safe.

At the top:

You're safe

with a large status indicator.

Display:

Current safety status

Last check-in

Current location

Emergency contacts

Active safety mode

Next scheduled check-in

Main button:

I'm Safe

Secondary button:

I Need Help

Another button:

Start Safety Check

6. SAFETY CHECK-IN SYSTEM

This is the core MVP feature.

Allow the user to start a safety check.

The user selects:

Check-in interval

30 minutes

1 hour

2 hours

4 hours

Custom

The application starts a countdown.

Example:

Next check-in in 01:43:21

When the timer reaches zero, show a highly visible notification:

Are you safe?

Buttons:

I'm Safe

I Need Help

If the user clicks I'm Safe:

Reset the timer

Record a successful check-in

Save timestamp and location

Update the dashboard

Add event to history

If the user clicks I Need Help:

Immediately enter Emergency Mode.

If the user does nothing:

Start the escalation process.

7. ESCALATION SYSTEM

Create a configurable escalation sequence.

Example:

Stage 1 — Check

The application displays:

We haven't received your check-in.

Countdown:

00:59

Buttons:

I'm Safe

I Need Help

Stage 2 — Emergency Contact

If the user still does not respond:

Display:

Your emergency contact is being alerted.

Create an emergency event in Supabase.

The emergency contact dashboard should immediately show:

Possible emergency detected

Include:

User name

Last known location

Last successful check-in

Time since last response

Current safety status

Emergency type

Map location

Stage 3 — Emergency Services

After another configurable delay, simulate escalation to emergency services.

Display:

Emergency services escalation initiated.

For the MVP, DO NOT actually call emergency services.

Instead create a simulated responder event:

Emergency Response Requested

8. EMERGENCY MODE

Create a dedicated emergency screen.

It should be visually clear and extremely simple.

Title:

Emergency Mode

Show:

Current location

Emergency status

Time emergency started

Emergency contacts being notified

Response status

Buttons:

Cancel Emergency

Require confirmation before cancelling.

I'm Safe

Allow the user to resolve the emergency.

When an emergency is active, the user's dashboard must clearly show:

EMERGENCY ACTIVE

9. LOCATION

Use the browser Geolocation API.

When the user gives permission:

Store:

latitude

longitude

timestamp

Display the current location on a map.

Use a map library such as Leaflet if necessary.

The emergency contact dashboard should be able to see the user's last known location.

Include a button:

Open location

which opens the location in a mapping service.

If location permission is denied, clearly explain that Lifeline cannot provide an accurate location and continue functioning without it.

Do NOT continuously track location in the background for this MVP.

10. EMERGENCY CONTACTS

Create a contacts page.

Allow the user to:

Add contact

Edit contact

Delete contact

Mark primary emergency contact

Fields:

Full name

Relationship

Phone number

Email

Priority

Example:

Sarah
Friend
Primary contact

When an emergency is triggered, the primary contact is notified first.

11. RESPONDER DASHBOARD

Create a separate /responder dashboard.

This simulates what an emergency contact or responder would see.

Dashboard title:

Lifeline Response Center

Display active emergencies.

Each emergency card should contain:

Person's name

Emergency status

Emergency type

Time detected

Last check-in

Last known location

Distance/location if available

Response status

Example:

Possible Emergency

Alex Johnson

No response for 18 minutes

Last known location:
Casablanca, Morocco

Last check-in:
02:14

[View Location]

[Contact Person]

[Mark Response Started]

[Resolve Emergency]

When an emergency is resolved, remove it from active emergencies and put it into response history.

12. EVENT HISTORY

Create a history page.

Record every important event:

Successful check-in

Missed check-in

Emergency triggered

Emergency contact notified

Response started

Emergency resolved

Location update

Display:

Date
Time
Event
Status

Example:

September 5, 2026 — 02:14

Safety check completed

September 5, 2026 — 04:14

Check-in missed

September 5, 2026 — 04:15

Emergency contact notified

13. SAFETY MODES

Create three modes.

Standard

Normal safety monitoring.

Living Alone

The user chooses regular check-in intervals.

Travel

The user enters:

Destination

Expected arrival time

Emergency contact

Display:

Travel Mode Active

When the expected arrival time passes without the user marking themselves safe, trigger the escalation flow.

14. SETTINGS

Allow the user to configure:

Check-in interval

Grace period

Emergency contact

Location sharing

Notification preferences

Travel mode

Emergency escalation settings

Add clear explanations for each setting.

15. DATABASE

Create proper Supabase tables.

Suggested schema:

profiles

id

full_name

email

phone

created_at

emergency_contacts

id

user_id

name

relationship

phone

email

priority

created_at

safety_sessions

id

user_id

mode

started_at

next_checkin_at

status

destination

expected_arrival

created_at

check_ins

id

user_id

session_id

timestamp

latitude

longitude

status

emergencies

id

user_id

type

status

detected_at

latitude

longitude

last_checkin_at

responder_status

resolved_at

created_at

emergency_notifications

id

emergency_id

contact_id

notification_type

sent_at

status

Make sure relationships and Row Level Security are configured correctly.

Users must only be able to access their own personal information and emergencies.

The responder/demo dashboard should only expose emergency information intended for the demo.

16. IMPORTANT MVP SIMULATION

Because this is a prototype, create a Demo Mode.

Add a clearly labeled:

Demo Mode

button in the application.

Demo Mode should allow me to demonstrate the entire emergency flow quickly without waiting for hours.

For example:

Simulate missed check-in

Clicking this should immediately create a missed check-in.

Then show:

Missed check-in detected

User prompted to respond

No response

Emergency contact notified

Emergency appears in Response Center

Location displayed

Responder marks response started

Emergency resolved

Also include:

Simulate Emergency

which immediately triggers Emergency Mode.

This is extremely important because I need to demonstrate the product during a pitch.

17. DESIGN

The design should feel like a serious safety product, not a generic startup dashboard.

Visual direction:

Clean

Minimal

Calm

Trustworthy

Modern

Accessible

High contrast during emergencies

Use mostly neutral backgrounds and restrained accent colors.

Normal state should feel calm.

Emergency state should immediately feel urgent.

Do not overuse gradients.

Do not make it look like a crypto/AI startup.

Think:

Apple Health + emergency response center + modern fintech simplicity.

Typography should be clean and highly readable.

Mobile-first is important because the primary user will use Lifeline from a phone.

18. EMERGENCY UX

During an emergency, remove unnecessary information.

The user should immediately see:

EMERGENCY ACTIVE

Help is being contacted.

Your location: [location]

Emergency contact: [name]

Buttons:

I'm Safe

Cancel Emergency

The interface should be usable under stress.

19. IMPORTANT SAFETY DISCLAIMER

The application should clearly state that the MVP is a prototype and does not replace emergency services.

Do not claim that Lifeline can reliably detect medical emergencies.

Use language such as:

Lifeline helps identify situations where you may be unable to ask for help. It is not a replacement for emergency services.

20. FUNCTIONAL REQUIREMENTS

Do NOT build static mockups.

Everything should work.

I should be able to:

Create an account

Log in

Add an emergency contact

Start a safety session

Set a check-in interval

See a live countdown

Complete a check-in

Miss a check-in

Trigger escalation

Create an emergency

See the emergency in the responder dashboard

See the user's last known location

Start a response

Resolve the emergency

See the entire event in history

Use Demo Mode to demonstrate the entire flow quickly

Persist all relevant data in Supabase.

Handle loading states, errors, empty states, permissions, and authentication properly.

Do not leave placeholder buttons.

Do not use fake data where real database functionality is expected.

If a feature cannot be implemented reliably in a browser environment, implement the closest functional simulation and clearly label it as a prototype feature.

21. DEMO SCRIPT

Optimize the application for this pitch scenario:

I am a student living alone.

I activate:

Living Alone Mode

I set a 1-minute demo check-in.

The countdown starts.

I intentionally don't respond.

Lifeline detects the missed check-in.

The application asks:

Are you safe?

I don't respond.

The system creates an emergency.

The responder dashboard receives:

Possible Emergency Detected

It shows my:

name

last check-in

location

emergency status

The responder clicks:

Start Response

Then:

Resolve Emergency

The emergency is closed and recorded in history.

This entire experience should be polished enough to demonstrate as an MVP during a startup pitch.

22. FINAL PRIORITY

Prioritize in this order:

Working safety/check-in system

Working emergency escalation simulation

Working location sharing

Working emergency-contact system

Working responder dashboard

Working database/authentication

Demo Mode

Good mobile UX

Visual polish

Do not spend most of the implementation time on the landing page.

The most important thing is that I can open the application and demonstrate Lifeline actually detecting a missed check-in and escalating an emergency.

Build the application now.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://safe-whisper-heartbeat.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c00d2632-544c-423c-b944-93027ebae99f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
