import type { RenderResult } from '@reonarudo/pikchr-renderer';

export interface CachedRender {
  render(source: string): Promise<RenderResult>;
  clear(): void;
}

/**
 * Remember recent results by fence body. Obsidian runs a code block processor again whenever a
 * section is re-rendered (scrolling, switching views, an edit elsewhere in the note), so without
 * this every pass would re-run pikchr. Identical bodies rendered at the same time share one
 * render. Failures and timeouts are cached, since they would only repeat; `unavailable` is not,
 * so a restarted renderer gets another chance.
 */
export function createCache(render: (source: string) => Promise<RenderResult>, max = 96): CachedRender {
  const entries = new Map<string, Promise<RenderResult>>();
  return {
    render(source) {
      const hit = entries.get(source);
      if (hit) {
        // Most recently used goes last; the first key is evicted first.
        entries.delete(source);
        entries.set(source, hit);
        return hit;
      }
      const pending = render(source);
      entries.set(source, pending);
      if (entries.size > max) entries.delete(entries.keys().next().value!);
      pending.then((result) => {
        if (result.status === 'unavailable' && entries.get(source) === pending) entries.delete(source);
      }, () => {
        if (entries.get(source) === pending) entries.delete(source);
      });
      return pending;
    },
    clear() {
      entries.clear();
    }
  };
}
