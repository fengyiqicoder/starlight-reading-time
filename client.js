// Browser side of starlight-reading-time.

const STRINGS = {
	en: { read: (n) => `${n} min read`, updated: 'Updated', outdated: (age) => `This page was last updated ${age} ago. Some details may be out of date.`, years: (n) => (n === 1 ? 'over a year' : `over ${n} years`), months: (n) => `${n} months`, summary: 'Summarize', hide: 'Hide summary', reading: 'Reading the page…', aiFoot: 'Summarized by AI from this page.' },
	zh: { read: (n) => `阅读约 ${n} 分钟`, updated: '更新于', outdated: (age) => `本页上次更新是 ${age}前，部分内容可能已过时。`, years: (n) => `${n} 年多`, months: (n) => `${n} 个月`, summary: '摘要', hide: '收起摘要', reading: '正在读这一页…', aiFoot: '由 AI 根据本页生成。' },
	ja: { read: (n) => `${n} 分で読めます`, updated: '更新日', outdated: (age) => `このページの最終更新は ${age}前です。内容が古くなっている可能性があります。`, years: (n) => `${n} 年以上`, months: (n) => `${n} か月`, summary: '要約', hide: '要約を閉じる', reading: 'ページを読んでいます…', aiFoot: 'このページをもとに AI が要約しました。' },
	es: { read: (n) => `${n} min de lectura`, updated: 'Actualizado', outdated: (age) => `Esta página se actualizó hace ${age}. Algunos detalles pueden estar desactualizados.`, years: (n) => (n === 1 ? 'más de un año' : `más de ${n} años`), months: (n) => `${n} meses`, summary: 'Resumir', hide: 'Ocultar resumen', reading: 'Leyendo la página…', aiFoot: 'Resumen de IA a partir de esta página.' },
	fr: { read: (n) => `${n} min de lecture`, updated: 'Mis à jour le', outdated: (age) => `Cette page a été mise à jour il y a ${age}. Certains détails peuvent être dépassés.`, years: (n) => (n === 1 ? 'plus d’un an' : `plus de ${n} ans`), months: (n) => `${n} mois`, summary: 'Résumer', hide: 'Masquer le résumé', reading: 'Lecture de la page…', aiFoot: 'Résumé par l’IA à partir de cette page.' },
	de: { read: (n) => `${n} Min. Lesezeit`, updated: 'Aktualisiert', outdated: (age) => `Diese Seite wurde zuletzt vor ${age} aktualisiert. Einige Angaben könnten veraltet sein.`, years: (n) => (n === 1 ? 'über einem Jahr' : `über ${n} Jahren`), months: (n) => `${n} Monaten`, summary: 'Zusammenfassen', hide: 'Zusammenfassung ausblenden', reading: 'Lese die Seite…', aiFoot: 'KI-Zusammenfassung dieser Seite.' },
	pt: { read: (n) => `${n} min de leitura`, updated: 'Atualizado em', outdated: (age) => `Esta página foi atualizada há ${age}. Alguns detalhes podem estar desatualizados.`, years: (n) => (n === 1 ? 'mais de um ano' : `mais de ${n} anos`), months: (n) => `${n} meses`, summary: 'Resumir', hide: 'Ocultar resumo', reading: 'Lendo a página…', aiFoot: 'Resumo da IA a partir desta página.' },
	ko: { read: (n) => `${n}분 분량`, updated: '업데이트', outdated: (age) => `이 페이지는 ${age} 전에 마지막으로 업데이트되었습니다. 일부 내용이 오래되었을 수 있습니다.`, years: (n) => `${n}년 이상`, months: (n) => `${n}개월`, summary: '요약', hide: '요약 닫기', reading: '페이지를 읽는 중…', aiFoot: '이 페이지를 바탕으로 AI가 요약했습니다.' },
};

function el(tag, attrs = {}, ...children) {
	const n = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (v === false || v == null) continue;
		if (k === 'class') n.className = v;
		else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
		else n.setAttribute(k, v === true ? '' : v);
	}
	n.append(...children.filter((c) => c != null));
	return n;
}

// Words for space-separated scripts, characters for Chinese, Japanese and Korean.
export function minutes(text, cfg) {
	const cjk = (text.match(/[぀-ヿ㐀-鿿豈-﫿가-힯]/g) || []).length;
	const words = (text.replace(/[぀-ヿ㐀-鿿豈-﫿가-힯]/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
	return Math.max(cfg.minMinutes, Math.round(words / cfg.wordsPerMinute + cjk / cfg.charsPerMinute));
}

export default function init(cfg) {
	const h1 = document.querySelector('h1#_top');
	const content = document.querySelector('.sl-markdown-content');
	if (!h1 || !content || document.querySelector('[data-has-hero]')) return;
	const path = location.pathname;
	if (cfg.exclude.some((p) => (p.endsWith('*') ? path.startsWith(p.slice(0, -1)) : path === p))) return;

	const lang = (document.documentElement.lang || 'en').toLowerCase();
	const t = { ...STRINGS.en, ...(STRINGS[lang.split('-')[0]] || {}) };
	for (const [k, v] of Object.entries(cfg.labels)) t[k] = typeof v === 'string' && typeof t[k] === 'function' ? () => v : v;
	addStyle();

	const clone = content.cloneNode(true);
	clone.querySelectorAll('[data-onetag-ui], .expressive-code, pre, script, style').forEach((n) => n.remove());
	const mins = minutes(clone.textContent || '', cfg);

	const parts = [el('span', {}, t.read(mins))];
	const time = document.querySelector('footer time[datetime], .meta time[datetime]');
	let updated = null;
	if (time && cfg.showUpdated) {
		updated = new Date(time.getAttribute('datetime'));
		if (!isNaN(updated)) parts.push(el('span', { 'aria-hidden': 'true' }, '·'), el('span', {}, t.updated + ' ', el('time', { datetime: time.getAttribute('datetime') }, time.textContent.trim())));
	}

	const panel = el('div', { class: 'srt-summary', hidden: true });
	let summarized = false;
	let button = null;
	if (cfg.ai) {
		button = el('button', { type: 'button', class: 'srt-link', 'aria-expanded': 'false', onclick: toggle }, t.summary);
		parts.push(el('span', { 'aria-hidden': 'true' }, '·'), button);
	}
	const line = el('p', { class: 'srt-line', 'data-onetag-ui': '' }, ...parts);
	h1.after(line);
	line.after(panel);

	if (updated && !isNaN(updated) && cfg.outdatedAfterDays > 0) {
		const days = (Date.now() - updated.getTime()) / 864e5;
		if (days > cfg.outdatedAfterDays) {
			const yrs = Math.floor(days / 365);
			const age = yrs >= 1 ? t.years(yrs) : t.months(Math.floor(days / 30));
			content.prepend(el('aside', { class: 'srt-outdated', role: 'note', 'aria-label': 'Outdated', 'data-onetag-ui': '' }, el('p', {}, t.outdated(age))));
		}
	}

	async function toggle() {
		const open = panel.hidden;
		panel.hidden = !open;
		button.setAttribute('aria-expanded', String(open));
		button.textContent = open ? t.hide : t.summary;
		if (!open || summarized) return;
		panel.textContent = t.reading;
		try {
			const api = await import('starlight-onetag/api');
			const out = el('div');
			panel.replaceChildren(out);
			await api.summarizePage(cfg.ai, out);
			panel.append(el('p', { class: 'srt-foot' }, t.aiFoot));
			summarized = true;
		} catch (e) {
			const api = await import('starlight-onetag/api').catch(() => null);
			panel.textContent = api ? api.errorText(e) : 'Could not load the AI helper.';
		}
	}
}

function addStyle() {
	if (document.getElementById('starlight-reading-time')) return;
	const s = document.createElement('style');
	s.id = 'starlight-reading-time';
	s.textContent = `
.srt-line { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .5rem; margin-top: .5rem; font-size: var(--sl-text-sm); color: var(--sl-color-gray-3); }
.srt-link { border: 0; background: none; padding: 0; font: inherit; color: var(--sl-color-text-accent); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.srt-link:focus-visible { outline: 2px solid var(--sl-color-accent); outline-offset: 2px; }
.srt-summary { margin-top: .75rem; padding: .75rem 1rem; border: 1px solid var(--sl-color-gray-5); border-inline-start: 3px solid var(--sl-color-accent); border-radius: .4rem; background: var(--sl-color-gray-6); font-size: var(--sl-text-sm); }
.srt-summary[hidden] { display: none; }
.srt-summary p { margin: 0 0 .5em; }
.srt-summary ul { margin: 0 0 .5em; padding-inline-start: 1.2em; }
.srt-outdated { padding: .75rem 1rem; border-inline-start: 4px solid var(--sl-color-orange); background: var(--sl-color-orange-low); color: var(--sl-color-white); }
.srt-outdated p { margin: 0; }
.srt-foot { color: var(--sl-color-gray-3); font-size: var(--sl-text-xs); }
`;
	document.head.append(s);
}
