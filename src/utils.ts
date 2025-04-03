type Selector = typeof HTMLElement.prototype.querySelector;
export class DOM {
  /**
   * Adding elements
   * */
  static createDomElement(html: string) {
    const dom = new DOMParser().parseFromString(html, "text/html");
    return dom.body.firstElementChild as HTMLElement;
  }
  static addStyleTag(css: string) {
    const styles = document.createElement("style");
    styles.textContent = css;
    document.head.appendChild(styles);
    return styles;
  }
  static addElementsToContainer(
    container: HTMLElement,
    elements: HTMLElement[]
  ) {
    const fragment = document.createDocumentFragment();
    elements.forEach((el) => fragment.appendChild(el));
    container.appendChild(fragment);
  }

  /**
   * querying elements
   * */
  static $ = (selector: string): HTMLElement | null =>
    document.querySelector(selector);
  static $$ = (selector: string): NodeListOf<HTMLElement> =>
    document.querySelectorAll(selector);

  static $throw = (selector: string): HTMLElement => {
    const el = DOM.$(selector);
    if (!el) {
      throw new Error(`Element not found: ${selector}`);
    }
    return el;
  };

  static createQuerySelectorWithThrow(
    containerElement: HTMLElement | ShadowRoot
  ) {
    const select = containerElement.querySelector.bind(
      containerElement
    ) as Selector;
    return ((_class: keyof HTMLElementTagNameMap) => {
      const query = select(_class);
      if (!query) throw new Error(`Element with selector ${_class} not found`);
      return query;
    }) as Selector;
  }
}

export function html(strings: TemplateStringsArray, ...values: any[]) {
  let str = "";
  strings.forEach((string, i) => {
    str += string + (values[i] || "");
  });
  return str;
}

export function css(strings: TemplateStringsArray, ...values: any[]) {
  let str = "";
  strings.forEach((string, i) => {
    str += string + (values[i] || "");
  });
  return str;
}

export function createReactiveProxy<T extends string, V>(
  key: T,
  value: V,
  onSet: (newValue: V) => void
) {
  const proxy = new Proxy({ [key]: value } as Record<T, V>, {
    set(target, p, newValue, receiver) {
      onSet(newValue);
      return Reflect.set(target, p, newValue, receiver);
    },
  });
  return proxy;
}

export class AbortControllerManager {
  private controller = new AbortController();

  get signal() {
    return this.controller.signal;
  }

  get isAborted() {
    return this.controller.signal.aborted;
  }

  reset() {
    this.controller = new AbortController();
  }

  abort() {
    this.controller.abort();
  }

  onAbort(callback: () => void) {
    this.controller.signal.addEventListener("abort", callback);
  }

  static createTimeoutSignal(timeoutMillis: number) {
    return AbortSignal.timeout(timeoutMillis);
  }
}

export class LocalStorageBrowser<T extends Record<string, any>> {
  constructor(private prefix: string = "") {}

  private getKey(key: keyof T & string): string {
    return this.prefix + key;
  }

  public set<K extends keyof T & string>(key: K, value: T[K]): void {
    window.localStorage.setItem(this.getKey(key), JSON.stringify(value));
  }

  public get<K extends keyof T & string>(key: K): T[K] | null {
    const item = window.localStorage.getItem(this.getKey(key));
    return item ? JSON.parse(item) : null;
  }

  public removeItem(key: keyof T & string): void {
    window.localStorage.removeItem(this.getKey(key));
  }

  public clear(): void {
    window.localStorage.clear();
  }
}

export const appStorage = new LocalStorageBrowser<{
  shouldSuperCompress: boolean;
  downloadType: "png" | "jpeg" | "webp";
}>("image_download_settings_");
