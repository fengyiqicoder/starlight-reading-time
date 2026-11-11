/**
 * starlight-reading-time: "5 min read · Updated Mar 3, 2026" under every Starlight page title,
 * and a note on pages that have not been updated in a long time.
 *
 *   import starlightReadingTime from "starlight-reading-time";
 *   starlight({ lastUpdated: true, plugins: [starlightReadingTime()] })
 */
import { makeAccessory } from './plugin.js';

export default function starlightReadingTime(options = {}) {
	return makeAccessory('starlight-reading-time', {
		wordsPerMinute: options.wordsPerMinute ?? 220,
		charsPerMinute: options.charsPerMinute ?? 400,
		minMinutes: options.minMinutes ?? 1,
		showUpdated: options.showUpdated ?? true,
		outdatedAfterDays: options.outdatedAfterDays ?? 365,
		labels: options.labels ?? {},
		exclude: options.exclude ?? [],
		ai: options.ai ?? false,
	});
}
