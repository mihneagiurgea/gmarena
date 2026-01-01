# Zones

There will be 4 or 5 zones, one next to each other on a line. We'll start with 5.

A zone can have 1 or more units in it, from both teams. At the start of the game, 
team A ("the player") units start on the left-most zone ("zone 0"), and
team B ("the opponent") units start on the right-most zone ("zone 4"). Team A units
"move forward" towards the right, while Team B units "mofr forward" towards the left.
In rare cases, units can move backwards.

## Distance
The distance between 2 units is equal to the distance between their zone's indexes.
E.g. units in the same Zone have distance = 0.

Melee attacks can only target other units with distance = 0, i.e. in the same zone.
Ranged attacks (including spels) can target units at any distance.

## Taunt
Normally, units can move past zones with enemy units, except the machanics of Taunt.

Within a given zone, we define the following:
Taunt(A) = the number of units from team A that have Taunt, in that zone
Num(B) = the number of units from team B, with or without Taunt

A unit from team B can move forward (as defined above) if and only if Num(B) > Taunt(A).
A unit from team B can always move backwards.

Viceversa applies fro team A.
