/**
 * 무료 GEO Scanner — 엔진.
 *
 * 대상 URL 을 서버에서 가져와 구조 휴리스틱 7항목을 채점한다.
 * 7번 항목(의료광고법 리스크)은 위서클의 차별점 — 기존 의료법 린터를 그대로 재사용.
 * 라이브 4엔진 인용 쿼리는 비용·지연 때문에 무료 스캔에 넣지 않는다(유료 업셀).
 */

import { lintForCompliance } from '../compliance/lint';

export interface ScanItem {
  key: string;
  label: string;
  icon: string;
  score: number; // 0~100
  status: 'good' | 'warn' | 'bad';
  findings: string[];
  fixes: string[];
}

export interface ScanReport {
  ok: boolean;
  url: string;
  domain: string;
  fetchedAt: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  items: ScanItem[];
  compliance: {
    status: 'pass' | 'warn' | 'fail';
    violationCount: number;
    failCount: number;
    warnCount: number;
    topViolations: { message: string; matches: string[]; severity: string }[];
  };
  error?: string;
}

const UA =
  'Mozilla/5.0 (compatible; WecircleGeoScanner/1.0; +https://geo-v2-beta.vercel.app/scanner)';

function normalizeUrl(raw: string): { url: string; origin: string; domain: string } | null {
  let s = (raw || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    return { url: u.toString(), origin: u.origin, domain: u.hostname.replace(/^www\./, '') };
  } catch {
    return null;
  }
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,text/plain,*/*' },
      signal: ctrl.signal,
      redirect: 'follow'
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function stripToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function statusOf(score: number): 'good' | 'warn' | 'bad' {
  return score >= 70 ? 'good' : score >= 45 ? 'warn' : 'bad';
}

function count(re: RegExp, hay: string): number {
  const m = hay.match(re);
  return m ? m.length : 0;
}

export async function scanTarget(rawUrl: string): Promise<ScanReport> {
  const norm = normalizeUrl(rawUrl);
  const now = new Date().toISOString();
  if (!norm) {
    return emptyReport(rawUrl, '', now, '유효한 URL 이 아닙니다. 예: clinic.co.kr');
  }

  const html = await fetchText(norm.url);
  if (!html) {
    return emptyReport(norm.url, norm.domain, now, '페이지를 불러오지 못했습니다. URL 이 공개 접속 가능한지 확인해 주세요.');
  }

  const [robots, llms] = await Promise.all([
    fetchText(norm.origin + '/robots.txt', 5000),
    fetchText(norm.origin + '/llms.txt', 5000)
  ]);

  const text = stripToText(html).slice(0, 24000);
  const lower = html.toLowerCase();

  // ---- 구조 신호 추출 ----
  const jsonLd = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const jsonLdRaw = jsonLd.join(' ');
  const h2h3 = count(/<h[23][\s>]/gi, html);
  const h1 = count(/<h1[\s>]/gi, html);
  const listItems = count(/<li[\s>]/gi, html);
  const tables = count(/<table[\s>]/gi, html);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
  const metaDesc = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
  const ogTags = count(/<meta[^>]+property=["']og:/gi, html);
  const questionish = count(/[?？]/g, text) + count(/(무엇|어떻게|언제|왜|얼마|가능한가요|인가요|하나요)/g, text);

  const items: ScanItem[] = [];

  // 1) AI 인용 가능성 (콘텐츠 구조)
  {
    let s = 0;
    const f: string[] = [];
    const fix: string[] = [];
    if (h2h3 >= 3) { s += 25; f.push(`소제목(h2/h3) ${h2h3}개 — 인용 청크 분할 양호`); }
    else { fix.push('내용을 소제목(h2/h3)으로 3개 이상 쪼개 AI 가 인용할 단위를 만드세요'); }
    if (listItems >= 5) { s += 15; f.push(`목록 항목 ${listItems}개 — 발췌 가능 구조`); }
    else { fix.push('핵심 정보를 불릿/번호 목록으로 정리하세요'); }
    if (questionish >= 4) { s += 25; f.push('질문형 표현 다수 — Q&A 인용에 유리'); }
    else { fix.push('환자가 실제로 묻는 질문("~하나요?")을 소제목으로 넣으세요'); }
    if (text.length >= 800) { s += 20; } else { fix.push('본문 분량이 얇습니다(800자 미만) — 주제별 상세 설명 보강'); }
    if (text.length >= 800 && h2h3 >= 2) { s += 15; }
    items.push({ key: 'citeability', label: 'AI 인용 가능성', icon: '🤖', score: clamp(s), status: statusOf(clamp(s)), findings: f, fixes: fix });
  }

  // 2) 구조화 데이터 (Schema.org)
  {
    let s = 0;
    const f: string[] = [];
    const fix: string[] = [];
    if (jsonLd.length > 0) { s += 40; f.push(`JSON-LD ${jsonLd.length}개 감지`); }
    else { fix.push('JSON-LD 구조화 데이터가 없습니다 — AI 가 페이지 의미를 파악하기 어렵습니다'); }
    if (/MedicalClinic|MedicalBusiness|Hospital|Physician|Dentist|MedicalProcedure|MedicalOrganization/i.test(jsonLdRaw)) { s += 30; f.push('의료 전용 스키마 감지'); }
    else { fix.push('MedicalClinic·Physician·MedicalProcedure 등 의료 스키마를 추가하세요'); }
    if (/FAQPage/i.test(jsonLdRaw)) { s += 20; f.push('FAQPage 스키마 감지'); }
    else { fix.push('FAQPage 스키마를 추가하면 AI 답변 인용률이 오릅니다'); }
    if (/"@type"\s*:\s*"(Organization|WebSite|LocalBusiness)"/i.test(jsonLdRaw)) { s += 10; }
    items.push({ key: 'schema', label: '구조화 데이터', icon: '🏗️', score: clamp(s), status: statusOf(clamp(s)), findings: f, fixes: fix });
  }

  // 3) AI 크롤러 접근성
  {
    let s = 0;
    const f: string[] = [];
    const fix: string[] = [];
    const r = (robots || '').toLowerCase();
    const blocks = /user-agent:\s*(gptbot|claudebot|perplexitybot|google-extended|ccbot)[\s\S]*?disallow:\s*\//i.test(robots || '');
    if (llms) { s += 35; f.push('llms.txt 운영 중 — AI 크롤러 친화'); }
    else { fix.push('llms.txt / llms-full.txt 를 추가해 AI 크롤러에 핵심 정보를 노출하세요'); }
    if (robots && !blocks) { s += 40; f.push('robots.txt 가 AI 크롤러(GPTBot·ClaudeBot·PerplexityBot)를 차단하지 않음'); }
    else if (blocks) { fix.push('robots.txt 가 AI 크롤러를 차단 중입니다 — 인용 자체가 불가합니다(즉시 해제 권장)'); }
    else { fix.push('robots.txt 가 없습니다 — 명시적으로 AI 크롤러를 허용하세요'); }
    if (r.includes('sitemap:')) { s += 15; f.push('sitemap 선언 감지'); }
    if (robots) { s += 10; }
    items.push({ key: 'crawler', label: 'AI 크롤러 접근성', icon: '⚙️', score: clamp(s), status: statusOf(clamp(s)), findings: f, fixes: fix });
  }

  // 4) E-E-A-T (의료 전문성·신뢰)
  {
    let s = 0;
    const f: string[] = [];
    const fix: string[] = [];
    if (/전문의|원장|의료진|진료과목|의사/.test(text)) { s += 30; f.push('의료진·전문의 정보 노출'); }
    else { fix.push('원장·전문의 프로필(경력·전문 분야)을 명시하세요 — AI 신뢰 신호의 핵심'); }
    if (/자격|면허|학회|논문|전문의\s*자격|board/i.test(text)) { s += 25; f.push('자격·학회·논문 등 권위 신호 감지'); }
    else { fix.push('학회 활동·논문·자격 등 검증 가능한 권위 신호를 추가하세요'); }
    if (/작성자|저자|감수|검토한|reviewed by|medically reviewed/i.test(text)) { s += 20; f.push('저자/감수 정보 감지'); }
    else { fix.push('콘텐츠에 "의료진 감수" 저자 정보를 붙이세요'); }
    if (/sameas|instagram\.com|youtube\.com|blog\.naver/i.test(lower)) { s += 15; f.push('외부 채널 연결(엔티티 일관성) 감지'); }
    if (/주소|오시는\s*길|tel:|전화|지도/i.test(text) || /tel:/.test(lower)) { s += 10; f.push('연락처·위치 정보 감지'); }
    items.push({ key: 'eeat', label: 'E-E-A-T 전문성', icon: '📋', score: clamp(s), status: statusOf(clamp(s)), findings: f, fixes: fix });
  }

  // 5) 콘텐츠 AI 친화도
  {
    let s = 0;
    const f: string[] = [];
    const fix: string[] = [];
    if (/자주\s*묻는\s*질문|faq|q&a|질문/i.test(text)) { s += 25; f.push('FAQ/Q&A 형식 감지'); }
    else { fix.push('"자주 묻는 질문" 섹션을 추가하세요 — AI 가 가장 잘 인용하는 형식'); }
    if (/방법|어떻게|절차|단계|준비물|과정/.test(text)) { s += 20; f.push('HowTo/절차형 콘텐츠 감지'); }
    else { fix.push('시술 과정·준비·회복을 단계(HowTo)로 정리하세요'); }
    if (/비교|차이|vs|장단점|어떤\s*게/i.test(text)) { s += 15; f.push('비교형 콘텐츠 감지'); }
    if (/(란|이란|는)\s*[^.?!]{4,40}(입니다|말합니다|의미합니다)/.test(text)) { s += 20; f.push('정의형 문장 감지 — 발췌 인용에 유리'); }
    else { fix.push('"○○란 …입니다" 정의형 문장을 넣으면 AI 가 그대로 떼어 씁니다'); }
    if (tables >= 1) { s += 20; f.push('표 구조 감지'); }
    items.push({ key: 'ai_friendly', label: '콘텐츠 AI 친화도', icon: '📝', score: clamp(s), status: statusOf(clamp(s)), findings: f, fixes: fix });
  }

  // 6) 브랜드 권위·엔티티
  {
    let s = 0;
    const f: string[] = [];
    const fix: string[] = [];
    if (title) { s += 20; f.push('페이지 title 존재'); } else { fix.push('명확한 <title> 을 설정하세요'); }
    if (metaDesc) { s += 15; } else { fix.push('meta description 을 추가하세요'); }
    if (ogTags >= 2) { s += 15; f.push('Open Graph 태그 감지'); } else { fix.push('og:title/description/image 를 추가하세요'); }
    if (h1 >= 1) { s += 20; f.push('h1 대표 제목 존재'); } else { fix.push('페이지당 h1 하나로 브랜드·주제를 명확히 하세요'); }
    if (/"sameas"/i.test(jsonLdRaw)) { s += 20; f.push('sameAs 엔티티 연결 감지'); } else { fix.push('JSON-LD 에 sameAs 로 공식 채널을 연결해 엔티티를 강화하세요'); }
    if (title && /병원|의원|클리닉|치과|피부과|성형|안과|한의원/.test(title)) { s += 10; f.push('title 에 진료 정체성 노출'); }
    items.push({ key: 'authority', label: '브랜드 권위·엔티티', icon: '🏆', score: clamp(s), status: statusOf(clamp(s)), findings: f, fixes: fix });
  }

  // 7) ⭐ 의료광고법 리스크 (위서클 차별점 — 린터 재사용)
  const lint = lintForCompliance(text);
  const failCount = lint.violations.filter((v) => v.severity === 'fail').length;
  const warnCount = lint.violations.filter((v) => v.severity === 'warn').length;
  {
    const s = clamp(100 - failCount * 25 - warnCount * 8);
    const st: 'good' | 'warn' | 'bad' = lint.status === 'fail' ? 'bad' : lint.status === 'warn' ? 'warn' : 'good';
    const f: string[] = [];
    const fix: string[] = [];
    if (lint.status === 'pass') { f.push('명백한 의료광고법 위반 표현 미검출'); }
    else {
      f.push(`잠재 위반 ${lint.violations.length}건 (금지 ${failCount} · 주의 ${warnCount})`);
      lint.violations.slice(0, 4).forEach((v) => fix.push(`${v.severity === 'fail' ? '[금지]' : '[주의]'} ${v.message}`));
    }
    items.push({ key: 'compliance', label: '의료광고법 리스크', icon: '🛡️', score: s, status: st, findings: f, fixes: fix });
  }

  const weights: Record<string, number> = {
    citeability: 20, schema: 15, crawler: 15, eeat: 15, ai_friendly: 10, authority: 10, compliance: 15
  };
  const overall = clamp(
    items.reduce((acc, it) => acc + it.score * (weights[it.key] || 0), 0) / 100
  );
  const grade: 'A' | 'B' | 'C' | 'D' = overall >= 80 ? 'A' : overall >= 65 ? 'B' : overall >= 50 ? 'C' : 'D';

  return {
    ok: true,
    url: norm.url,
    domain: norm.domain,
    fetchedAt: now,
    overallScore: overall,
    grade,
    items,
    compliance: {
      status: lint.status,
      violationCount: lint.violations.length,
      failCount,
      warnCount,
      topViolations: lint.violations.slice(0, 5).map((v) => ({
        message: v.message, matches: v.matches.slice(0, 5), severity: v.severity
      }))
    }
  };
}

function emptyReport(url: string, domain: string, now: string, error: string): ScanReport {
  return {
    ok: false, url, domain, fetchedAt: now, overallScore: 0, grade: 'D', items: [],
    compliance: { status: 'pass', violationCount: 0, failCount: 0, warnCount: 0, topViolations: [] },
    error
  };
}
