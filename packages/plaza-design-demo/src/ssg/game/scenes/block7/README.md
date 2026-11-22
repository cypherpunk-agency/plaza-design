# Capsule Block 7 lobby (Act I)

Act I Chapter 1, beats 2 and 8 (docs/design/ACT-I-REDESIGN.md). Built from the `dt-capsule-lobby` art set.
The lobby, the stairwell up to 7/F and the capsule door at `7b` are one level; the lift is out.

- CONCIERGE cannot verify you and points to the fire exit. The front door (`front-door`) refuses;
  the fire exit (`fire-exit-door`, closes behind you) lets you out once and sets `act1:out`.
- The service latch (`service-latch`, below street level) is the way home in beat 8. Its device
  state `opened` drives the latch picture through the composition binding `latch.opened`; the
  native watch in `gameplay.json` turns it into `act1:latch`.
- Phase content (`ch1-*`) lives in `scene.json` `phases`.
