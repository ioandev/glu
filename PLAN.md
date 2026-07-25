





I want to build a pomodoro / tracker.

The project is going to be build in NEXT.JS and the backend is going to be express.js available at /api.

The entire domain is going to be ioan.dev/glu.

The project will be called GLU.

We are going to work with a tablet, that's the main way to use this. Although it can be half a tablet, so more like a phone size, sometimes.

There is going to be some empty space in the right top side of the page, and that will be for todoist integration, a later ADR.

For now, essential the UI is going to do this:
- Have a pomodoro timer, which goes down, with pause and start and stop buttons, and with a counter that goes around the circle and it shows nicely. 
- above the pomodoro timer there will be settings: 5m, 10m, 15m, 20m, 30m, 45m, 60m. These will affect the current timer, if the user wants to.
- There will be +2 +5 -2 -5 buttons below the timer that add or subtract from the time itself
- There will be a way to set with toggles what the user was doing at the time: Music, Podcast, TV, Silence (this would untoggle the rest), Noisy, Headphones (on/off)

The pomodoro will be on the first half of the screen (vertical slice, it will occupy half of tha area on the left), and the type of environment they were in will be on the bottom right corner, and the top right will be todoist (todo in the next one).

We are just writing ADRs for now.
Write ADR:
- 01: Setup of nextjs project with latest packages + latest mantine 
- 02: UI Implementation with design using mantine and dark/white background of the desired features
- 03: Storybook and testing of the UI
- 04: Making the app a PWM

No backend will be implemented until adr 04 or 05.



















