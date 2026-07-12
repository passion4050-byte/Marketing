'use client';

/**
 * ContentCompetitivenessScoped — 어드민 언어 스코프에 반응하는 래퍼.
 *   - scope='all'(통합): SSR 초기값 그대로.
 *   - scope=국내/EN/JA/ZH: /api/admin/top-contents?lang= 로 재페치.
 */
import { useEffect, useState } from 'react';
import { ContentCompetitiveness } from './ContentCompetitiveness';
import { readScope, SCOPE_EVENT, scopeToContentLang } from './ScopeSelector';

interface Content {
  id: number;
  title: string;
  slug: string;
  tenantName: string;
  tenantId: number;
  publishedAt: string;
  keyword: string;
  mentionsForKeyword: number;
  isPartner: boolean;
  partnerCategory: string | null;
}

export function ContentCompetitivenessScoped({
  initialContents,
}: {
  initialContents: Content[];
}) {
  const [scope, setScope] = useState('all');
  const [contents, setContents] = useState<Content[]>(initialContents);

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
      setContents(initialContents);
      return;
    }
    const lang = scopeToContentLang(scope);
    let cancelled = false;
    fetch(`/api/admin/top-contents?days=30&lang=${lang ?? ''}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setContents(j?.ok ? (j.contents ?? []) : []);
      })
      .catch(() => {
        if (!cancelled) setContents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, initialContents]);

  return <ContentCompetitiveness contents={contents} />;
}
