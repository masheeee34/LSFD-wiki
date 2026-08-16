'use client';

import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface DefinitionTooltipProps {
  word: string;
  explanation: string;
}

export const DefinitionTooltip: React.FC<DefinitionTooltipProps> = ({ word, explanation }) => {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            style={{
              borderBottom: '1.5px dashed var(--color-brand-red)',
              cursor: 'help',
              color: 'var(--color-text-primary)',
              fontWeight: 500,
              paddingBottom: '1px',
            }}
          >
            {word}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={4}
            style={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '10px 14px',
              maxWidth: '280px',
              boxShadow: 'var(--card-shadow)',
              zIndex: 1000,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-brand-red)',
                marginBottom: '4px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Glossaire médical
            </div>
            <div
              style={{
                fontSize: '12.5px',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.45,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {explanation}
            </div>
            <Tooltip.Arrow style={{ fill: 'var(--color-bg-surface)', stroke: 'var(--color-border)', strokeWidth: 1 }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export default DefinitionTooltip;
