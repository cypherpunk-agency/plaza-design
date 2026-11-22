# Kessel's kitchen under the noodle stall (Act I)

Act I Chapter 1, beat 7 (docs/design/ACT-I-REDESIGN.md). Built from the `dt-kessel-clinic` art set: the
stall street above, the cellar hatch (open after dark, after the fixer's referral) and Kessel's
room below street level, with robot shells on the shelves.

- Talking to Kessel fits the implant (`kessel.fit` sets `act1:implant`; the phase grants hacking
  stage `inspect`).
- The privacy shutter is the first solo use: its device state `raised` drives the picture through
  the binding `shutter.raised`, and the native watch in `gameplay.json` sets `act1:shutter`.
- A stool at the stall offers waits until dark.

The art set still carries its own copy of the stall street; joining this room under the real
Downtown stall is open (see ROADMAP M4).
