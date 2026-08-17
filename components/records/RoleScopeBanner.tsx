'use client';

import { useState, useEffect } from 'react';
import type { CertificationLevel, MedicalSpecs } from '@/types';

interface RoleScopeBannerProps {
  recordCategory: string;
  specs?: MedicalSpecs;
}

const ROLES: Array<{ id: CertificationLevel; label: string; short: string; color: string }> = [
  { id: 'all', label: 'Tous les rôles', short: 'Tous', color: 'var(--color-text-secondary)' },
  { id: 'emt', label: '🚑 EMT-B (Basic)', short: 'EMT-B', color: '#3b82f6' },
  { id: 'aemt', label: '⚡ AEMT (Advanced)', short: 'AEMT', color: '#f59e0b' },
  { id: 'paramedic', label: '🩺 Paramedic (ALS)', short: 'Paramedic', color: '#ef4444' },
];

const LEVEL_WEIGHT: Record<CertificationLevel, number> = {
  all: 0,
  emt: 1,
  aemt: 2,
  paramedic: 3,
  medical_director: 4,
};

export default function RoleScopeBanner({ recordCategory, specs }: RoleScopeBannerProps) {
  const [selectedRole, setSelectedRole] = useState<CertificationLevel>('all');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('lsfd_user_role') as CertificationLevel;
    if (saved && ROLES.some(r => r.id === saved)) {
      setSelectedRole(saved);
    }
  }, []);

  const handleRoleChange = (role: CertificationLevel) => {
    setSelectedRole(role);
    localStorage.setItem('lsfd_user_role', role);
  };

  const minCert: CertificationLevel = specs?.minCertification || (
    recordCategory === 'medication' ? 'paramedic' : 'emt'
  );

  const reqWeight = LEVEL_WEIGHT[minCert] || 1;
  const userWeight = LEVEL_WEIGHT[selectedRole] || 0;

  const isBelowLevel = selectedRole !== 'all' && userWeight < reqWeight;
  const isAboveOrEqual = selectedRole !== 'all' && userWeight >= reqWeight;

  return (
    <div style={{
      marginBottom: '16px',
      backgroundColor: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {/* Role Switcher Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-muted)',
            fontWeight: 700,
          }}>
            Habilitation Secouriste :
          </span>
        </div>

        {/* Role Pills */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {ROLES.map(role => {
            const isActive = isMounted && selectedRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleRoleChange(role.id)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: isActive ? `1px solid ${role.color}` : '1px solid var(--color-border)',
                  backgroundColor: isActive ? 'var(--color-bg-elevated)' : 'var(--color-bg-subtle)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{role.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Scope & Escalation Alert based on user role */}
      {isMounted && isBelowLevel && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '12.5px',
          lineHeight: 1.5,
          color: 'var(--color-text-primary)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#fbbf24',
            fontWeight: 700,
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '4px',
          }}>
            <span>⚠️ HABILITATION REQUISE : {minCert.toUpperCase()} / ALS</span>
          </div>

          <div style={{ color: 'var(--color-text-secondary)', marginBottom: specs?.escalationRule ? '6px' : '0' }}>
            Vous visualisez cette fiche en tant que <strong>{selectedRole.toUpperCase()}</strong>. Ce protocole requiert une qualification supérieure (<strong>{minCert.toUpperCase()}</strong>).
          </div>

          {/* Custom Escalation Directive from Admin */}
          {specs?.escalationRule ? (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '12px',
              color: '#fde68a',
            }}>
              <strong>🛑 Conduite & Règle d'escalade :</strong> {specs.escalationRule}
            </div>
          ) : (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '12px',
              color: '#fde68a',
            }}>
              <strong>🛑 Conduite recommandée :</strong> Débutez les gestes de base (BLS), sécurisez les voies aériennes, administrez l'O2 et demandez immédiatement un renfort Paramedic (ALS).
            </div>
          )}

          {/* Allowed vs Forbidden Gestures */}
          {(specs?.allowedGestures || specs?.forbiddenGestures) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginTop: '8px',
              fontSize: '11.5px',
            }}>
              {specs.allowedGestures && (
                <div style={{ color: '#4ade80' }}>
                  <strong>✅ Gestes autorisés {selectedRole.toUpperCase()} :</strong> {specs.allowedGestures}
                </div>
              )}
              {specs.forbiddenGestures && (
                <div style={{ color: '#f87171' }}>
                  <strong>⛔ Gestes réservés ALS :</strong> {specs.forbiddenGestures}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isMounted && isAboveOrEqual && (
        <div style={{
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderLeft: '4px solid #22c55e',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#4ade80',
        }}>
          <span>✅</span>
          <span>
            <strong>Scope of Practice validé :</strong> Vous êtes habilité(e) ({selectedRole.toUpperCase()}) à appliquer l'ensemble des manœuvres de cette fiche.
          </span>
        </div>
      )}
    </div>
  );
}
