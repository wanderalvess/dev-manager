import React from 'react';
import type { MarkdownBlock } from '../../utils/markdownReaderParser';
import { MarkdownCallout, MarkdownQuote } from './MarkdownCallout';
import { MarkdownCodeBlock } from './MarkdownCodeBlock';
import { MarkdownHeading } from './MarkdownHeading';
import { MarkdownInline } from './MarkdownInline';
import { MarkdownList } from './MarkdownList';
import { MarkdownTable } from './MarkdownTable';

interface MarkdownBlocksProps {
  blocks: MarkdownBlock[];
  searchTerm: string;
  copiedCodeIndex: number | null;
  onCopyCode: (code: string, index: number) => void;
}

export const MarkdownBlocks: React.FC<MarkdownBlocksProps> = ({ blocks, searchTerm, copiedCodeIndex, onCopyCode }) => (
  <>
    {blocks.map((block) => {
      switch (block.kind) {
        case 'code':
          return (
            <MarkdownCodeBlock
              key={block.key}
              language={block.language}
              lineCount={block.lineCount}
              code={block.code}
              isCopied={copiedCodeIndex === block.codeIndex}
              onCopy={() => onCopyCode(block.code, block.codeIndex)}
            />
          );
        case 'callout':
          return <MarkdownCallout key={block.key} type={block.type} lines={block.lines} searchTerm={searchTerm} />;
        case 'quote':
          return <MarkdownQuote key={block.key} lines={block.lines} isPrompt={block.isPrompt} searchTerm={searchTerm} />;
        case 'heading':
          return (
            <MarkdownHeading
              key={block.key}
              level={block.level}
              text={block.text}
              id={block.id}
              isFirst={block.isFirst}
              searchTerm={searchTerm}
            />
          );
        case 'hr':
          return <hr key={block.key} className="my-6 border-border/70" />;
        case 'table':
          return <MarkdownTable key={block.key} header={block.header} rows={block.rows} searchTerm={searchTerm} />;
        case 'list':
          return <MarkdownList key={block.key} items={block.items} searchTerm={searchTerm} />;
        case 'paragraph':
          return (
            <p key={block.key} className="my-2.5 text-foreground/90 leading-relaxed font-normal">
              <MarkdownInline text={block.text} searchTerm={searchTerm} />
            </p>
          );
      }
    })}
  </>
);
