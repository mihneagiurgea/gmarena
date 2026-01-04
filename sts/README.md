# Game Engine

This is a two-player game: "the player" controls team A that contains 2-3 units,
and "the opponent" controls team B that contains another 2-3 units.

Each player has a deck of 10-15 cards that are NOT unique.

## Zones 

There are 3 zones, one next to each other on a line, numbered from left to right as such:
A - X - B. A zone can have 1 or more units in it, including enemy units.

At the start of the game, all units from Team A are assigned to zone A, and all units
from Team B are assigned to zone B.

## Unit Stats
Units have the following stats:
 - HP (Health Points, when it reaches 0 the unit dies)
 - Attack Range: melee or range
 - Attack Type: physical or magic
 - Damage: how much damage they deal on attack

## Start of game
At the start of game:
 - each player's deck is shuffled randomly, then each player draws 5 cards
 - the ordering of units is done by randomizing all units; the order does not change across
   the game; then the game starts by the first unit playing their turn, then the 2nd etc.
 - the game ends when only units from a single team are alive

## Playing your Turn 
If the current unit is melee, and this is their first turn this game, instead of taking their turn as normal, they will choose a card to discard, then advance to 
zone X and end their turn. The "at the end of turn" from below applies as normal.

Otherwise, the controlling player chooses a card from their hand and plays it, potentially selecting a target unit, depending on the card.

Then, at the end of the turn:
 - all effects' duration is decremented by 1; if the duration is 0, the effect ends
 - the player draws cards up to 5 cards

Once a card is played, it is shuffled back into the deck.

## Attacking
When a unit ("the attacker") attacks another unit ("the target"),
the damage is subtracted from the target's HP.

## Ranged Attacks
Ranged attacks (including spells) can target any unit from any zone, e.g. a unit
from zone A can attack a unit from zone X or B.

## Melee Attacks
Melee attacks can target any unit from either the same zone, or an adjacent zone,
e.g. a unit from zone X can attack a unit from zone X or B.

### Effect: Taunt (X)
Taunt X is a debuff effect that lasts X turns. When an attacker applies it on a
unit ("the taunted"), that unit must attack one of its taunters, if able, for X
rounds. 

Note: since this is an effect, at the end of the taunted unit's turn, X is decreased by 1.

If a unit is taunted and chooses to attack, it must attack one of the taunter units.
If a unit is taunted and chooses not to attack, no restrictions.

## Cards

Cards are divided into two categories based on who can play them:

### Basic Cards
Basic cards have no restrictions and can be played by any unit type.

- **Attack**: Deal damage to target enemy

### Tech Cards
Tech cards are more powerful but have requirements that restrict which units can play them.
Requirements are a comma-separated string of: `melee`, `ranged`, `physical`, `magic`

Examples:
- **Shield Bash** (requires: 'melee'): Deal damage and apply Taunt 2
- **Fireball** (requires: 'magic'): Deal magic damage to target enemy
- **Power Shot** (requires: 'ranged'): Deal increased damage

### Card Definition Structure
See `cards-data.js` for more details, e.g.:

```javascript
{
  id: 'shieldBash',
  name: 'Shield Bash',
  description: 'Deal damage and apply Taunt 2',
  type: 'tech',
  requires: 'melee',  // null for Basic cards, or 'melee, physical' for multiple
  effects: { damage: true, taunt: 2 },
  target: 'enemy'
}
```

See `cards-data.js` for the full card definition format and examples.

# UI (User Interface)
We will rename the "Action Section" to the "Hand Section", where we'll display each card in hand.

# TODO
- [ ] Block
- [ ] Absorb / Armor / Magic Resistance
- [ ] Implement Cards 
- [ ] Better UI for playing card
- [ ] Better sprites for cards
- [x] Add some unit tests for foo-data.js and engine.js 