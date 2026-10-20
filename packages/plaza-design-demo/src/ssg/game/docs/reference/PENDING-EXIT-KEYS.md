# Pending exit-key references

Exit requirements resolve against the same prospective Network key metadata used by Play and
grouped source Save. The editor no longer limits the key picker to the shipping keyring.

`validateSceneDocument` checks the requirement's shape. `validateExitKeyReferences` checks its
foreign key after source assembly, alongside destination/arrival resolution. Native pending scenes,
the authored scene catalogue and complete pending Network validation all use this helper. A supplied
Network context is authoritative; a removed shipping key is not silently accepted from old metadata.
Standalone callers without a context use the normal shipping metadata plus their own declared keys.

Creating a key and binding an exit can be saved/imported together. Removing referenced metadata or
importing the exit edit alone rejects atomically. The existing Game exit permission check reads the
authored key ID directly; no alias, extra inventory owner or runtime compatibility adapter is added.
Play fixtures use the same pending key vocabulary, including newly authored keys.

`check-pending-exit-keys.mts` PASS:

- Actual typed picker exposes a new pending Network key and binds it to Downtown's Moth exit.
- Actual Game `useExit` refuses no key and the former key, then accepts the new key.
- Native and new catalogue scenes validate against their complete prospective key context.
- Missing metadata and incomplete bundle/source Save edits reject without partial changes.
- Pending fixture Save accepts the new key only with the correct current vocabulary.
- Bundle/history, paired protected Save, fresh shipping SCENES import and exact byte Undo pass.