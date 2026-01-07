# Game Arena - TODO

## Core Gameplay

- [x] Add support for Taunt and implement engaged/free concept
- [x] Add Charge (with -4 WC)
- [x] Add enchantments: spells that modify stats for rest of combat
- [x] Add one more mechanic that adds depth (will-points, cool-downs, or similar)
- [ ] Consider further simplifying to a graph-like area:
 - graph: (1) - (2) - (4)
             \_ (3) _/ 
 - graph is similar to DoTa, but maybe with just 2 lanes by default
 - if a Taunt unit is in an area, enemy's can't advance (or maybe 1 enemy can?);  
   (this way defender plays "intercept", attacker plays "spread")
   (but if you spread, you can't focus fire the tank; if you keep to together you CAN focur fire)

! OMG this is BRILLIANT ! there should be other such maps 
 
- [ ] More spell ideas from old GM, links here:
 - https://docs.google.com/spreadsheets/d/1GjDTtwDdn_kqOreSQrsKBHdfvNzV1iXPxMw_feuQGhc/edit?gid=0#gid=0
 - https://docs.google.com/spreadsheets/d/1coCtJ5eE8WOmy_poox0suLWVRFTRlbd_vH2lEC8zCek/edit?gid=0#gid=0
- [ ] Implment more cards

## AI

- [ ] Implement an excellent AI using AlphaZero-style system
- [ ] Run a few simulations thru the AI, see if the game / AI makes sense.

## Admin

- [x] Interface to help with debugging

## UI/UX

- [ ] Add button to see simulation results: how many games, win rate, can click on a few games to see log: 3 random from each winner. 
TBD how to show this UI.   
- [ ] Fix zone lane UI styling (currently looks bad)
- [ ] Improve UI to make it tablet-friendly
- [ ] Improve UI / sprites
- [ ] Better UI for playing card
- [ ] Better sprites for cards
  
## Persistence & Multiplayer

- [ ] Store state in client-side cookies (survive tab refresh)
- [ ] Store state in a DB server-side
- [ ] Enable multi-player mode

## Meta Game

- [ ] Add out-of-combat part: building your war-band, advancing to the next "round"

## Feedback

- [ ] Gather more feedback

## Code
- Delete the other folders?
- Can we further simplify the code before we move further?
- Rewrite to TypeScript?


