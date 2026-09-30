"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

/**
 * Output text and chat answers as Markdown with maths ($…$ and $$…$$ via KaTeX). Raw HTML in
 * the text is dropped (`skipHtml`) and react-markdown's URL filter strips `javascript:` links,
 * so model output can't inject markup. Single newlines are kept as line breaks, like the plain
 * `whitespace-pre-line` text this replaced.
 */

const PROSE = [
  "min-w-0 break-words [overflow-wrap:anywhere]",
  "[&>*+*]:mt-2",
  "[&_strong]:font-medium [&_strong]:text-ink [&_em]:italic",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 [&_li>ul]:mt-1 [&_li>ol]:mt-1 [&_li::marker]:text-muted",
  "[&_code]:rounded [&_code]:bg-panel [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.86em] [&_code]:text-ink",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-night [&_pre]:p-3.5 [&_pre]:text-[12.5px] [&_pre]:leading-relaxed [&_pre]:text-night-text",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[length:inherit] [&_pre_code]:text-night-text",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:italic",
  "[&_:is(h1,h2,h3,h4,h5,h6)]:font-medium [&_:is(h1,h2,h3,h4,h5,h6)]:tracking-[-0.015em] [&_:is(h1,h2,h3,h4,h5,h6)]:text-ink [&_:is(h1,h2)]:text-[1.1em]",
  "[&_hr]:border-line",
  "[&_table]:w-full [&_table]:text-left [&_table]:text-[0.94em] [&_th]:border-b [&_th]:border-line-strong [&_th]:px-2 [&_th]:py-1.5 [&_th]:font-medium [&_th]:text-ink [&_td]:border-b [&_td]:border-line [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top",
  "[&_.katex]:text-[1.05em] [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1",
].join(" ");

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-red-700 underline decoration-red-300 underline-offset-2 transition-colors hover:decoration-red-500">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  // Images in generated text would be remote URLs the model made up; show the alt text instead.
  img: ({ alt }) => (alt ? <span className="text-muted italic">[{alt}]</span> : null),
};

/** Inside phrasing-only parents (buttons, flip cards, headings): paragraphs become block spans. */
const inlineComponents: Components = {
  ...components,
  p: ({ children }) => <span className="block">{children}</span>,
};

const remarkPlugins = [remarkGfm, remarkMath, remarkBreaks];
const rehypePlugins: NonNullable<Parameters<typeof ReactMarkdown>[0]["rehypePlugins"]> = [[rehypeKatex, { throwOnError: false, strict: "ignore", output: "htmlAndMathml" }]];

export const Markdown = memo(function Markdown({ text, className = "", inline = false }: { text: string; className?: string; inline?: boolean }) {
  const md = (
    <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={inline ? inlineComponents : components} skipHtml>
      {text}
    </ReactMarkdown>
  );
  return inline ? <span className={`block ${PROSE} ${className}`}>{md}</span> : <div className={`${PROSE} ${className}`}>{md}</div>;
});
