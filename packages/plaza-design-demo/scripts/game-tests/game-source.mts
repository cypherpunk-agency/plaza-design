/**
 * Source text of the game loop for checks that read it. runtime/game.ts holds the Game class with
 * one-line delegates; the method bodies live in runtime/game/*.ts as `name(game, ...)` functions.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const runtime = 'src/ssg/game/runtime';

/** runtime/game.ts and every runtime/game/*.ts module, relative to src/ssg/game. */
export function gameFiles(): string[] {
  return [
    'runtime/game.ts',
    ...fs
      .readdirSync(path.join(runtime, 'game'))
      .filter((name) => name.endsWith('.ts'))
      .sort()
      .map((name) => 'runtime/game/' + name),
  ];
}

const isPropertyName = (n: ts.Identifier) =>
  (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
  (ts.isPropertyAssignment(n.parent) && n.parent.name === n);

/** All game-loop source text, concatenated. */
export function gameSource(): string {
  return gameFiles()
    .map((name) => fs.readFileSync(path.join('src/ssg/game', name), 'utf8'))
    .join('\n');
}

/**
 * runtime/game.ts with each delegate replaced by its implementation, as it read before the split:
 * `name(params) { const game = this; ...body }`. For checks that inspect or run Game methods.
 */
export function gameClassSource(): string {
  const impls = new Map<string, { params: string; body: string; async: boolean }>();
  for (const name of gameFiles().slice(1)) {
    const text = fs.readFileSync(path.join('src/ssg/game', name), 'utf8');
    const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    for (const st of sf.statements) {
      if (!ts.isFunctionDeclaration(st) || !st.name || !st.body) continue;
      const [self, ...rest] = st.parameters;
      // `game` becomes `this` again; a nested function that used `game` keeps it through an alias.
      const selfName = self.name.getText(sf);
      const edits: { start: number; end: number }[] = [];
      let nested = false;
      const visit = (n: ts.Node, inFunction: boolean) => {
        if (ts.isIdentifier(n) && n.text === selfName && !isPropertyName(n)) {
          if (inFunction) nested = true;
          else edits.push({ start: n.getStart(sf), end: n.end });
        }
        const fn = ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isClassLike(n);
        ts.forEachChild(n, (c) => visit(c, inFunction || fn));
      };
      visit(st.body, false);
      let body = st.body.getText(sf);
      const base = st.body.getStart(sf);
      for (const e of edits.sort((a, b) => b.start - a.start))
        body = body.slice(0, e.start - base) + 'this' + body.slice(e.end - base);
      impls.set(st.name.text, {
        params: rest.map((p) => p.getText(sf)).join(', '),
        body: '{ ' + (nested ? `const ${selfName} = this;` : '') + body.slice(1),
        async: !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
      });
    }
  }
  const file = path.join(runtime, 'game.ts');
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const game = sf.statements.find((n) => ts.isClassDeclaration(n) && n.name?.text === 'Game')!;
  const edits: { start: number; end: number; text: string }[] = [];
  for (const m of (game as ts.ClassDeclaration).members) {
    if (!ts.isMethodDeclaration(m) || !m.body) continue;
    const impl = impls.get(m.name.getText(sf));
    if (!impl) continue;
    const mods = (m.modifiers ?? []).map((x) => x.getText(sf)).join(' ');
    edits.push({
      start: m.getStart(sf),
      end: m.end,
      text: `${mods ? mods + ' ' : ''}${impl.async ? 'async ' : ''}${m.name.getText(sf)}(${impl.params}) ${impl.body}`,
    });
  }
  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
