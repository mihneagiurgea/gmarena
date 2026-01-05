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
The controlling player chooses a card from their hand and plays it, potentially selecting a target unit, depending on the card.

### Advance (Key: A)
Any unit can play Advance to move to the next zone:
- Zone A → Zone X
- Zone X → Zone B

Playing Advance:
- Does **not** end the turn (the unit can still play a card)
- Applies **Weaken (1)** to the unit (expires at end of turn)
- Cannot advance beyond Zone B

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

## Effects

### Effect: Taunt (X)
Taunt X is a debuff effect that lasts X turns. When an attacker applies it on a
unit ("the taunted"), that unit must attack one of its taunters, if able, for X
rounds.

Note: since this is an effect, at the end of the taunted unit's turn, X is decreased by 1.

If a unit is taunted and chooses to attack, it must attack one of the taunter units.
If a unit is taunted and chooses not to attack, no restrictions.

### Effect: Block
Block is a temporary shield that absorbs incoming damage before HP is affected.

- When a unit takes damage, block absorbs it first
- If block >= damage: all damage is blocked, HP unchanged, block is reduced by the damage amount
- If block < damage: block is depleted to 0, remaining damage is subtracted from HP
- Block resets to 0 at the start of the unit's next turn
- Block from multiple sources stacks (e.g., playing Defend twice gives 20 block)

Example: A unit with 50 HP and 15 Block takes 25 damage.
Block absorbs 15, leaving 10 damage. HP is reduced to 40. Block becomes 0.

### Effect: Weaken (X)
Weaken is a debuff effect that lasts X turns. A weakened unit deals 25% less damage (rounded down).

- Only affects damage dealt by attack cards
- Does not affect block, healing, or aura effects
- Multiple stacks do not increase the reduction (still 25%)

Example: A unit with 20 base damage that is Weakened deals 15 damage (20 × 0.75 = 15).

### Effect: Cripple (X)
Cripple is a stronger debuff effect that lasts X turns. A crippled unit deals 50% less damage (rounded down).

- Only affects damage dealt by attack cards
- Does not affect block, healing, or aura effects
- Multiple stacks do not increase the reduction (still 50%)
- If a unit has both Weaken and Cripple, only Cripple applies (the stronger effect)

Example: A unit with 20 base damage that is Crippled deals 10 damage (20 × 0.50 = 10).

## Auras
Auras are like effects but last until end of combat.

Some units might have static Aura that are always active, since start of combat.

Example of some Aura:s
  - Armor (X): Reduce incoming physical damage by X
  - Resistance (X): Reduce incoming magic damage by X

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
See `data.js` for more details, e.g.:

```javascript
{
  id: 'shieldBash',
  name: 'Shield Bash',
  description: 'Deal 10 damage and Taunt (2)',
  requires: 'melee',  // null for Basic cards, or 'melee, physical' for multiple
  effects: { damage: 10, taunt: 2 },
  target: 'enemy'
}
```

See `data.js` for the full card definition format and examples.

# UI (User Interface)
We will rename the "Action Section" to the "Hand Section", where we'll display each card in hand.
