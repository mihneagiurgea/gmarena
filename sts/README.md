# Fixed Position Zones (Variant 3)

There are 4 zones, one next to each other on a line, numbered from left to right as such:
AR (Team A - Ranged), AM (Team A - Melee), BM (Team B - Melee), BR (Team B - Ranged).
 - Units are assigned to a zone and never move.
 - A zone can have 1 or more units in it, but only from a single team.

## Start of Combat
At the start of the game, units are assigned automatically to a zone, as such:
 - Team A ("the player") ranged units will start in AR, and melee units in AM
 - Team B ("the opponent") ranged units will start in BR, and melee units in BM

## Ranged Attacks
Ranged attacks (including spells) can target any unit from any zone.

TODO: some bugs here; do we really need zones?
## Taunt X
Taunt X is a debuff effect that lasts X turns. When an attacker applies it on a
unit ("the taunted"), that unit must attack one of its taunters, if able, for X
rounds. At the end of the taunted unit's turn, X is decreased by 1.

If a unit is taunted, it can only attack one of the taunter units. It can still
choose to not attack any unit (skip turn).

If a Melee attack has Taunt X and hits, the defender will be Taunted X by the attacker.
If it misses, nothing happens.

## Melee Attacks
Melee attacks can be made against units from the adjacent zone (e.g. if attacker
is in AM zone, can attack any unit from BM), or against units in the enemy ranged
zone (e.g. BR) if taunted by a unit there.
