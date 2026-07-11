'use client';

/**
 * MarketShareDiagnosisScoped — 어드민 언어 스코프에 반응하는 래퍼.
 *   - scope='all'(통합): SSR 초기값 그대로 (기존 동작·수치 무변경).
 *   - scope=국내/EN/JA/ZH: /api/admin/market-share?lang= 로 재페치.
 * 프레젠테이션(MarketShareDiagnosis)은 그대로 재사용.
 */
import { useEffect, useState } from 'react';
import { MarketShareDiagnosis } from './MarketShareDiagnosis';
import { readScope, SCOPE_EVENT, scopeToLang } from './ScopeSelector';

interface DomainRow {
  domain: string;
  citations: number;
  isOwn?: boolean;
  isCompetitor?: boolean;
}

export function MarketShareDiagnosisScoped({
  initialDomains,
  initialMedimap,
  initialTotal,
  daysWindow = 30,
}: {
  initialDomains: DomainRow[];
  initialMedimap: number;
  initialTotal: number;
  daysWindow?: number;
}) {
  const [scope, setScope] = useState('all');
  const [domains, setDomains] = useState<DomainRow[]>(initialDomains);
  const [medimap, setMedimap] = useState(initialMedimap);
  const [total, setTotal] = useState(initialTotal);

  useEffect(() => {
    setScope(readScope());
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (typeof d === 'string') setScope(d);
    };
    window.addEventListener(SCOPE_EVENT, onEvt);
    return () => window.removeEventListener(SCOPE_EVENT, onEvt);
  }, []);

  useEffect(() => {
    if (scope === 'all') {
      setDomains(initialDomains);
      setMedimap(initialMedimap);
      setTotal(initialTotal);
      return;
    }
    const lang = scopeToLang(scope);
    let cancelled = false;
    fetch(`/api/admin/market-share?days=${daysWindow}&lang=${lang ?? ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok) {
          setDomains(j.domains ?? []);
          setMedimap(j.medimapCitations ?? 0);
          setTotal(j.totalCitations ?? 0);
        } else {
          setDomains([]);
          setMedimap(0);
          setTotal(0);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDomains([]);
        setMedimap(0);
        setTotal(0);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, daysWindow, initialDomains, initialMedimap, initialTotal]);

  return (
    <MarketShareDiagnosis
      domains={domains}
      medimapCitations={medimap}
      totalCitations={total}
      daysWindow={daysWindow}
    />
  );
}
