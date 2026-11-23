# Kessel's rooms under the noodle stall (Act I)

Act I Chapter 1, beat 7 (docs/design/ACT-I-REDESIGN.md). Built from the `dt-kessel-clinic` art set, minus its
copy of the street: this zone is only the rooms. It joins Downtown by the stairs seam `downtown-kessel`
(`world/zone-graph.json`): the ladder `stairs-hatch` climbs up through the pavement beside the stall
(Downtown x 705).

- At the foot of the ladder the cook stands at the cellar door (`cellar-hatch`, a barrier: open after
  dark, after the fixer's referral). Below it, Kessel's room and the shelves of robot shells.
- Talking to Kessel fits the implant (`kessel.fit` sets `act1:implant`; the phase grants hacking
  stage `inspect`).
- The privacy shutter is the first solo use: its device state `raised` drives the picture through
  the binding `shutter.raised`, and the native watch in `gameplay.json` sets `act1:shutter`.
- To wait for dark, use the stool at the stall on Downtown (`rest:stool`).
