// A tiny element builder. Facebook enforces Trusted Types, so the panel never uses innerHTML.

type Listeners = { [E in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[E]) => void };
type AttributeValue = string | number | boolean | null | undefined;

/** Attributes by name (true sets an empty attribute; false, null and undefined skip it), plus `on` listeners. */
export type Props = { on?: Listeners } & Record<string, AttributeValue | Listeners>;

export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (name === 'on') {
      for (const [type, listener] of Object.entries(value as Listeners)) {
        element.addEventListener(type, listener as EventListener);
      }
    } else if (value === true) {
      element.setAttribute(name, '');
    } else if (typeof value === 'string' || typeof value === 'number') {
      element.setAttribute(name, String(value));
    }
  }
  for (const child of children.flat()) {
    if (child != null && child !== false) element.append(child);
  }
  return element;
}
