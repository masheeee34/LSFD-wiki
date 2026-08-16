'use client';

import React from 'react';
import Link from 'next/link';

interface RecordLinkProps {
  slug: string;
  label: string;
}

export const RecordLink: React.FC<RecordLinkProps> = ({ slug, label }) => {
  return (
    <Link
      href={`/records/${slug}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        color: 'var(--color-brand-red)',
        fontWeight: 600,
        textDecoration: 'none',
        padding: '0 2px',
        borderRadius: '3px',
        transition: 'all 120ms ease',
      }}
      className="wiki-record-link"
    >
      <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>{label}</span>
      <span style={{ fontSize: '11px', textDecoration: 'none', opacity: 0.8 }}>→</span>
    </Link>
  );
};

export default RecordLink;
