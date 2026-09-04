import { Fragment, type ReactNode } from "react";

/**
 * Markdown mínimo para las respuestas del asistente.
 *
 * El modelo emite listas y negritas por mucho que el prompt se lo prohíba, y
 * pintadas como texto plano se amontonan en un párrafo con guiones sueltos. Esto
 * cubre lo que un asistente financiero produce de verdad: párrafos, viñetas,
 * listas numeradas, negrita y código en línea.
 *
 * No se usa una librería de Markdown a propósito: `/chat` no está en la ruta
 * crítica del registro, pero tampoco necesita tablas ni HTML anidado, y así no
 * entra un parser de decenas de kB por tres reglas. Si algún día hacen falta
 * tablas o enlaces, el reemplazo es `react-markdown` + `remark-gfm`.
 *
 * Nada pasa por `dangerouslySetInnerHTML`: la salida son nodos de React, así que
 * el texto del modelo no puede inyectar marcado.
 */

type Block = { kind: "p"; lines: string[] } | { kind: "ul" | "ol"; items: string[] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
/** Negrita y código en línea. El grupo de captura conserva los delimitadores. */
const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;

function parse(source: string): Block[] {
  const blocks: Block[] = [];

  for (const raw of source.split("\n")) {
    const line = raw.trimEnd();
    const last = blocks.at(-1);

    if (!line.trim()) {
      // La línea en blanco cierra el bloque abierto, sea del tipo que sea.
      if (last) blocks.push({ kind: "p", lines: [] });
      continue;
    }

    const bullet = line.match(BULLET);
    if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else blocks.push({ kind: "ul", items: [bullet[1]] });
      continue;
    }

    const ordered = line.match(ORDERED);
    if (ordered) {
      if (last?.kind === "ol") last.items.push(ordered[1]);
      else blocks.push({ kind: "ol", items: [ordered[1]] });
      continue;
    }

    if (last?.kind === "p") last.lines.push(line);
    else blocks.push({ kind: "p", lines: [line] });
  }

  return blocks.filter((b) => (b.kind === "p" ? b.lines.length > 0 : b.items.length > 0));
}

function inline(text: string): ReactNode {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-current/10 px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/**
 * La viñeta va en su propia columna de la rejilla, no como marcador de lista:
 * así la segunda línea de un ítem largo sangra bajo el texto y no bajo el punto,
 * que es lo que hace que una lista se lea como lista y no como un párrafo roto.
 */
function Items({ block }: { block: Extract<Block, { kind: "ul" | "ol" }> }) {
  const Tag = block.kind === "ul" ? "ul" : "ol";
  return (
    <Tag className="space-y-1.5">
      {block.items.map((item, i) => (
        <li key={i} className="grid grid-cols-[auto_1fr] gap-x-2">
          <span aria-hidden className="tabular-nums opacity-50 select-none">
            {block.kind === "ul" ? "•" : `${i + 1}.`}
          </span>
          <span>{inline(item)}</span>
        </li>
      ))}
    </Tag>
  );
}

export function RichText({ content }: { content: string }) {
  const blocks = parse(content);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) =>
        block.kind === "p" ? (
          // pre-line conserva el salto simple dentro de un párrafo, que el
          // modelo usa para separar frases sin abrir uno nuevo.
          <p key={i} className="whitespace-pre-line">
            {inline(block.lines.join("\n"))}
          </p>
        ) : (
          <Items key={i} block={block} />
        ),
      )}
    </div>
  );
}
