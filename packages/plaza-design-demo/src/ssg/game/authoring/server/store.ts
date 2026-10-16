/** Node-only local authoring storage. Never imported by game/runtime code. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export interface DocumentDescriptor {
  id: string; file: string; kind: 'composition' | 'timeline' | 'world'; validate(value: unknown): unknown;
  /** Source-specific invariants checked against the current revision, including direct API saves. */
  validateUpdate?(before: unknown, after: unknown): void;
}
export interface LoadedDocument { id: string; kind: DocumentDescriptor['kind']; revision: string; value: unknown }
export interface Edit { id: string; revision: string; value: unknown }
export interface SaveResult { transaction: string; documents: LoadedDocument[] }
export class StoreError extends Error { constructor(public code: 'invalid' | 'conflict' | 'path' | 'io', message: string) { super(message); } }
interface Backup { version: 1; transaction: string; state: 'prepared' | 'committed' | 'rolled-back'; entries: { id: string; before: string; after: string }[] }
export interface StoreOptions {
  root: string; documents: DocumentDescriptor[];
  /** Validates references using the complete prospective document set before any write. */
  validateAll?(documents: ReadonlyMap<string, unknown>): void;
  /** Focused failure injection; not exposed over HTTP. */
  beforeReplace?(index: number): void;
}
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function inside(root: string, p: string) { const rel = path.relative(root, p); return !path.isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + path.sep); }
function encode(v: unknown) {
  const visit = (x: unknown, seen = new Set<object>()) => {
    if (x === null || typeof x === 'string' || typeof x === 'boolean' || typeof x === 'number' && Number.isFinite(x)) return;
    if (typeof x !== 'object' || seen.has(x!) || !Array.isArray(x) && Object.getPrototypeOf(x) !== Object.prototype && Object.getPrototypeOf(x) !== null) throw new StoreError('invalid', 'Only finite plain JSON data can be saved');
    seen.add(x!); for (const [k, value] of Object.entries(x!)) { if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new StoreError('invalid', 'Reserved document key'); visit(value, seen); } seen.delete(x!);
  };
  visit(v);
  let s: string | undefined;
  try { s = JSON.stringify(v, null, 2); } catch { throw new StoreError('invalid', 'Document is not JSON serializable'); }
  if (s === undefined) throw new StoreError('invalid', 'Document is not JSON serializable');
  return s + '\n';
}
export class AuthoringStore {
  private root: string;
  private history: string;
  private descriptors = new Map<string, DocumentDescriptor>();
  constructor(private options: StoreOptions) {
    this.root = fs.realpathSync(options.root);
    const files = new Set<string>();
    for (const descriptor of options.documents) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(descriptor.id) || this.descriptors.has(descriptor.id)) throw new StoreError('invalid', 'Invalid or duplicate allowlist id');
      this.descriptors.set(descriptor.id, descriptor); const file = this.file(descriptor.id);
      if (files.has(file.toLowerCase()) || path.relative(this.root, file).split(path.sep)[0] === '.authoring-history') throw new StoreError('invalid', 'Duplicate file or reserved history path');
      files.add(file.toLowerCase());
    }
    this.history = path.join(this.root, '.authoring-history');
    if (!fs.existsSync(this.history)) fs.mkdirSync(this.history);
    this.safePath(this.history, false);
    this.recover();
  }
  private safePath(p: string, file: boolean) {
    const absolute = path.resolve(p);
    if (!inside(this.root, absolute)) throw new StoreError('path', 'Document is outside authoring root');
    const pieces = path.relative(this.root, absolute).split(path.sep).filter(Boolean); let current = this.root;
    for (const part of pieces) {
      current = path.join(current, part);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !inside(this.root, fs.realpathSync(current))) throw new StoreError('path', 'Symlink/reparse document paths are forbidden');
    }
    if (file && !fs.statSync(absolute).isFile()) throw new StoreError('path', 'Document must be a regular file');
    return absolute;
  }
  private file(id: string) {
    const descriptor = this.descriptors.get(id); if (!descriptor) throw new StoreError('path', 'Document id is not allowlisted');
    return this.safePath(path.resolve(this.root, descriptor.file), true);
  }
  private parse(id: string, raw: string) {
    try { const value: unknown = JSON.parse(raw); this.descriptors.get(id)!.validate(value); return value; }
    catch (e) { throw new StoreError('invalid', `${id}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  read(id: string): LoadedDocument {
    const raw = fs.readFileSync(this.file(id), 'utf8');
    return { id, kind: this.descriptors.get(id)!.kind, revision: hash(raw), value: this.parse(id, raw) };
  }
  list() { return [...this.descriptors.keys()].map(id => this.read(id)); }
  /** Synchronous serialized transaction; all validation/conflict checks happen before mutation. */
  save(edits: Edit[]): SaveResult {
    return this.commit(edits);
  }
  /** Recovery may retain original JSON formatting; this path is never accepted from HTTP edits. */
  private commit(edits: Edit[], originalBytes?: ReadonlyMap<string, string>): SaveResult {
    if (!edits.length || edits.length > this.descriptors.size) throw new StoreError('invalid', 'Empty or oversized save');
    const unique = new Set<string>(), entries: Backup['entries'] = [];
    const prospective = new Map(this.list().map(doc => [doc.id, doc.value]));
    for (const edit of edits) {
      if (!edit || typeof edit.id !== 'string' || typeof edit.revision !== 'string' || unique.has(edit.id)) throw new StoreError('invalid', 'Invalid/duplicate edit');
      unique.add(edit.id); const before = fs.readFileSync(this.file(edit.id), 'utf8');
      if (hash(before) !== edit.revision) throw new StoreError('conflict', `${edit.id}: source changed; reload or export pending edits`);
      const encoded = encode(edit.value), after = originalBytes?.get(edit.id) ?? encoded; const value = this.parse(edit.id, after);
      try { this.descriptors.get(edit.id)!.validateUpdate?.(JSON.parse(before), value); }
      catch (e) { throw new StoreError('invalid', `${edit.id}: ${e instanceof Error ? e.message : String(e)}`); }
      prospective.set(edit.id, value);
      entries.push({ id: edit.id, before, after });
    }
    try { this.options.validateAll?.(prospective); } catch (e) { throw new StoreError('invalid', `Document references: ${String(e)}`); }
    const transaction = randomUUID(), backup: Backup = { version: 1, transaction, state: 'prepared', entries };
    this.writeBackup(backup);
    const staged: { id: string; file: string; temporary: string }[] = [];
    let replaced = 0;
    try {
      for (const entry of entries) {
        const file = this.file(entry.id), temporary = path.join(path.dirname(file), `.${path.basename(file)}.${transaction}.tmp`);
        this.writeNew(temporary, entry.after); staged.push({ id: entry.id, file, temporary });
      }
      // Recheck after staging, before the first source replacement.
      for (const entry of entries) if (fs.readFileSync(this.file(entry.id), 'utf8') !== entry.before) throw new StoreError('conflict', `${entry.id}: changed during save`);
      for (const stage of staged) {
        this.options.beforeReplace?.(replaced); this.file(stage.id);
        if (fs.readFileSync(stage.file, 'utf8') !== entries[replaced].before) throw new StoreError('conflict', `${stage.id}: changed during save`);
        fs.renameSync(stage.temporary, stage.file); replaced++;
      }
      backup.state = 'committed'; this.writeBackup(backup);
    } catch (error) {
      // Restore only files replaced by this transaction. Prepared journal survives a failed rollback.
      try {
        const failures:string[]=[];
        for(let i=0;i<replaced;i++){try{this.restoreOriginal(entries[i]);}catch(restoreError){failures.push(String(restoreError));}}
        if(failures.length)throw new StoreError('conflict',failures.join('; '));
        backup.state = 'rolled-back'; this.writeBackup(backup);
      } catch (rollbackError) { throw new StoreError('io', `Save failed; recovery journal ${transaction} requires attention: ${String(rollbackError)}`); }
      if (error instanceof StoreError) throw error;
      throw new StoreError('io', `Save failed and original documents restored: ${String(error)}`);
    } finally { for (const stage of staged) if (fs.existsSync(stage.temporary)) fs.unlinkSync(stage.temporary); }
    return { transaction, documents: entries.map(e => this.read(e.id)) };
  }
  /** Undo is a new validated transaction and requires current revisions for every affected document. */
  undo(transaction: string, revisions: Record<string, string>): SaveResult {
    const backup = this.backup(transaction);
    if (backup.state !== 'committed') throw new StoreError('invalid', 'Only committed saves can be undone');
    const edits = backup.entries.map(e => {
      const current = this.read(e.id);
      if (current.revision !== hash(e.after) || revisions[e.id] !== current.revision) throw new StoreError('conflict', `${e.id}: changed since transaction`);
      return { id: e.id, revision: current.revision, value: this.parse(e.id, e.before) };
    });
    return this.commit(edits, new Map(backup.entries.map(entry => [entry.id, entry.before])));
  }
  private writeNew(file: string, value: string) { const fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, value); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
  /** Rollback owns only the exact bytes written by this transaction, never a subsequent outside edit. */
  private restoreOriginal(entry:Backup['entries'][number]){
    const raw=fs.readFileSync(this.file(entry.id),'utf8');
    if(raw===entry.before)return;
    if(raw!==entry.after)throw new StoreError('conflict',`${entry.id}: rollback conflicts with outside edit`);
    this.replace(entry.id,entry.before,entry.after);
  }
  private replace(id: string, value: string, expected?:string) {
    const file = this.file(id), temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
    try { this.writeNew(temporary,value);this.file(id);if(expected!==undefined&&fs.readFileSync(file,'utf8')!==expected)throw new StoreError('conflict',`${id}: changed during rollback`);fs.renameSync(temporary,file); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  private historyFile(transaction: string) {
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/.test(transaction)) throw new StoreError('path', 'Invalid transaction id');
    this.safePath(this.history, false); return path.join(this.history, transaction + '.json');
  }
  private writeBackup(backup: Backup) {
    const file = this.historyFile(backup.transaction), temporary = file + '.' + randomUUID() + '.tmp';
    try { this.writeNew(temporary, encode(backup)); fs.renameSync(temporary, file); } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  private backup(transaction: string): Backup {
    const file = this.historyFile(transaction); this.safePath(file, true);
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Backup;
    if (data.version !== 1 || data.transaction !== transaction || !['prepared', 'committed', 'rolled-back'].includes(data.state) || !Array.isArray(data.entries) || !data.entries.length) throw new StoreError('invalid', 'Invalid recovery journal');
    const ids = new Set<string>();
    for (const e of data.entries) { if (ids.has(e.id) || typeof e.before !== 'string' || typeof e.after !== 'string') throw new StoreError('invalid', 'Invalid journal entry'); ids.add(e.id); this.file(e.id); this.parse(e.id, e.before); this.parse(e.id, e.after); }
    return data;
  }
  private recover() {
    for (const name of fs.readdirSync(this.history)) {
      if (!/^[\da-f-]{36}\.json$/.test(name)) continue;
      const backup = this.backup(name.slice(0, -5)); if (backup.state !== 'prepared') continue;
      // A crash cannot overwrite subsequent outside edits. Refuse startup on ambiguous state.
      for (const e of backup.entries) { const raw = fs.readFileSync(this.file(e.id), 'utf8'); if (raw !== e.before && raw !== e.after) throw new StoreError('conflict', `${e.id}: interrupted save conflicts with outside edit`); }
      for(const e of backup.entries)this.restoreOriginal(e);
      backup.state = 'rolled-back'; this.writeBackup(backup);
    }
  }
}
