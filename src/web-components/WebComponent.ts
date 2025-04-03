type Selector = {
  <K extends keyof HTMLElementTagNameMap>(selectors: K):
    | HTMLElementTagNameMap[K]
    | null;
  <K extends keyof SVGElementTagNameMap>(selectors: K):
    | SVGElementTagNameMap[K]
    | null;
  <K extends keyof MathMLElementTagNameMap>(selectors: K):
    | MathMLElementTagNameMap[K]
    | null;
  <K extends keyof HTMLElementDeprecatedTagNameMap>(selectors: K):
    | HTMLElementDeprecatedTagNameMap[K]
    | null;
  <E extends Element = Element>(selectors: string): E | null;
};

type SafeSelector = <K extends keyof HTMLElementTagNameMap>(
  selectors: K
) => HTMLElementTagNameMap[K];

function querySelectorWithThrow(containerElement: HTMLElement | ShadowRoot) {
  const select = containerElement.querySelector.bind(
    containerElement
  ) as Selector;
  return ((_class: keyof HTMLElementTagNameMap) => {
    const query = select(_class);
    if (!query) throw new Error(`Element with selector ${_class} not found`);
    return query;
  }) as SafeSelector;
}

/**
 * Tips for using this class:
 *
 * 1. Always call connectedCallback() and always do super.connectedCallback() in the child class.
 * Always do DOM stuff in connectedCallback() and not in the constructor.
 */

export default abstract class WebComponent<
  T extends readonly string[] = readonly string[]
> extends HTMLElement {
  protected shadow: ShadowRoot;
  protected styles: HTMLStyleElement;
  protected template: HTMLTemplateElement;
  public $: Selector;
  public $throw: SafeSelector;

  /**
   * A singleton way to register a custom element.
   * You must call this method in order to render the custom element.
   * @param name the name of the custom element
   * @param _class  the class of the custom element
   */
  static register(name: string, _class: CustomElementConstructor): void {
    if (!customElements.get(name)) {
      customElements.define(name, _class);
    }
  }

  /**
   * Might be blocked depending on CSP. Basically swaps out values
   * for ${} placeholders in a string.
   *
   * example:
   *
   * ```ts
   * WebComponent.interpolate("Hello ${name}", {name: "world"}) // returns "Hello world"
   * ```
   *
   *
   * @param str the string to interpolate
   * @param params  the object with the values to interpolate
   * @returns
   */
  static interpolate<V extends Record<string, any>>(str: string, params: V) {
    const names = Object.keys(params);
    const values = Object.values(params);
    return new Function(...names, `return \`${str}\`;`)(...values) as string;
  }

  static createTemplate(templateId: string, HTMLContent: string) {
    const template = document.createElement("template");
    template.id = templateId;
    template.innerHTML = HTMLContent;
    return template;
  }

  async loadExternalCSS(filepath: string) {
    try {
      const request = await fetch(filepath);
      if (!request.ok) {
        throw new Error(
          `Failed to load CSS from ${filepath}: ${request.status}`
        );
      }
      const css = await request.text();
      this.styles.textContent = css;
    } catch (error) {
      console.error(`Error loading external CSS ${error}`);
    }
  }

  private templateId: string;
  constructor(options: {
    templateId?: string; // template id
    HTMLContent?: string; // html content of template
    cssFileName?: string; // filename of css to apply on template, if provided
    cssContent?: string; // css content to apply on template, if provided
  }) {
    // 1. always call super()
    super();
    this.templateId = options.templateId || "default-template";
    // 2. create shadow DOM and create template
    this.shadow = this.attachShadow({ mode: "open" });
    this.$ = this.shadow.querySelector.bind(this.shadow);
    this.$throw = querySelectorWithThrow(this.shadow);

    this.styles = document.createElement("style");
    this.template = WebComponent.createTemplate(
      this.templateId,
      options.HTMLContent ??
        (this.constructor as typeof WebComponent).HTMLContent
    );

    // 3. attach styles
    if (options.cssContent) this.styles.textContent = options.cssContent;
    else if (options.cssFileName) this.loadExternalCSS(options.cssFileName);
    else
      this.styles.textContent = (
        this.constructor as typeof WebComponent
      ).CSSContent;
  }

  static get HTMLContent() {
    return "";
  }

  static get CSSContent() {
    return "";
  }

  // called when element is inserted to the DOM
  protected connectedCallback() {
    this.createComponent();
    console.log(`${this.templateId}: connectedCallback finished executing`);
  }

  private createComponent() {
    if (!this.shadow.contains(this.styles)) {
      this.shadow.appendChild(this.styles);
    }
    const content = this.template.content.cloneNode(true);
    this.shadow.appendChild(content);
  }

  // triggered when element is removed from document
  protected disconnectedCallback() {
    console.log("disconnected");
  }

  // triggered when element is moved to new document (only with iframes)
  protected adoptedCallback() {
    console.log("adopted");
  }

  // region ATTRIBUTES

  // override this getter to specify which attributes to observe
  static get observedAttributes() {
    return [] as readonly string[];
  }

  // gets an attribute from the observedAttributes
  getObservableAttr(attrName: T[number]) {
    const attr = this.attributes.getNamedItem(attrName);
    return attr?.value;
  }

  // sets an attribute from the observedAttributes
  setObservableAttr(attrName: T[number], value: string) {
    this.setAttribute(attrName, value);
  }

  // removes an attribute from the observedAttributes
  removeObservableAttr(attrName: T[number]) {
    this.removeAttribute(attrName);
  }

  // listens to changes of attributes from the observedAttributes
  attributeChangedCallback(
    attrName: T[number],
    oldVal: string,
    newVal: string
  ) {
    console.log("attributeChangedCallback run", attrName, oldVal, newVal);
  }
}
