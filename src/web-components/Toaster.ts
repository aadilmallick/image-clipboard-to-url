import { css, html } from "../utils";
import WebComponent from "./WebComponent";

const observedAttributes = ["data-position", "data-timeout"] as const;

type ToastType = "info" | "success" | "danger" | "default" | "warning";
type ToastManagerOptions = {
  timeout?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
};
interface Props {
  "data-timeout"?: ToastManagerOptions["timeout"];
  "data-position"?: ToastManagerOptions["position"];
}

class Toast {
  public element: HTMLElement;
  private timeoutId: number | null = null;
  private duration: number;
  constructor({
    message,
    duration = 3000,
    type = "default",
    onClick,
  }: {
    message: string;
    type?: ToastType;
    duration?: number;
    onClick?: () => void;
  }) {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.classList.add(`toast-${type}`);
    toast.style.setProperty("--toast-duration", `${duration}ms`);
    toast.innerText = message;

    this.element = toast;
    this.duration = duration;

    this.element.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        onClick?.();
        this.dismiss();
      },
      {
        once: true,
      }
    );
  }

  animateOut() {
    const animation = this.element.animate(
      [{ opacity: 0, transform: "translateX(250px)" }],
      {
        duration: 250,
      }
    );
    // wait for animation to finish
    animation.onfinish = () => {
      this.element.remove();
    };
  }

  show() {
    this.timeoutId = setTimeout(() => {
      this.animateOut();
      this.timeoutId = null;
    }, this.duration);
  }

  dismiss() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.animateOut();
    }
  }
}

export default class Toaster extends WebComponent<typeof observedAttributes> {
  private position: ToastManagerOptions["position"];
  private timeout?: number;
  constructor() {
    super({
      templateId: "toaster-element",
    });
  }

  // region Overrides

  attributeChangedCallback(
    attrName: (typeof observedAttributes)[number],
    oldVal: string,
    newVal: string
  ): void {
    super.attributeChangedCallback(attrName, oldVal, newVal);
    if (attrName === "data-position" && oldVal !== newVal) {
      this.$(".toast-container")?.classList.remove(oldVal);
      this.$(".toast-container")?.classList.add(newVal);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.position = (this.dataset.position ||
      "bottom-right") as ToastManagerOptions["position"];
    this.timeout = (this.dataset.timeout || 3000) as number;
    console.log(this.position, this.timeout);
    this.$(".toast-container")?.classList.add(this.position!);
  }

  static get observedAttributes() {
    return observedAttributes;
  }

  static registerSelf() {
    WebComponent.register("toaster-element", Toaster);
  }

  static isAlreadyRegistered(): boolean {
    return customElements.get("toaster-element") !== undefined;
  }

  static get HTMLContent() {
    return html`<div class="toast-container"></div> `;
  }

  static get CSSContent() {
    return css`
      .toast-container {
        position: fixed;
        z-index: 9999 !important;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;

        &.bottom-left {
          bottom: 0;
          left: 0;
        }

        &.bottom-right {
          bottom: 0;
          right: 0;
        }

        &.top-left {
          top: 0;
          left: 0;
        }

        &.top-right {
          top: 0;
          right: 0;
        }
        .toast {
          --color: #333;
          background-color: white;
          color: var(--color);
          border: 1px solid #eee;
          border-radius: 0.5rem;
          min-width: 8rem;
          max-width: 15rem;
          word-wrap: break-word;
          padding: 1rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          position: relative;
          animation: toast 0.4s ease-in-out;
          overflow: hidden;
          cursor: pointer;

          &::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 0.25rem;
            background-color: var(--color);
            animation: progress var(--toast-duration) linear both;
            transform-origin: left;
          }

          &.toast-success {
            --color: #2ecc71;
          }

          &.toast-warning {
            --color: #f1c40f;
          }

          &.toast-danger {
            --color: #e74c3c;
          }

          &.toast-info {
            --color: #3498db;
          }
        }
      }

      @keyframes progress {
        0% {
          transform: scaleX(0);
        }
        100% {
          transform: scaleX(1);
        }
      }

      @keyframes toast {
        0% {
          transform: translateX(100px);
          opacity: 0;
        }
        85% {
          transform: translateX(-1rem);
        }
        100% {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
  }

  // region Custom methods

  static toast(message: string, type: ToastType = "default") {
    const toasterElement = document.querySelector("toaster-element") as Toaster;
    console.log(toasterElement);
    if (!toasterElement) {
      throw new Error("Toaster element not found");
    }
    toasterElement.toast(message, type);
  }

  toast(message: string, type: ToastType = "default") {
    const toast = new Toast({
      message,
      type,
      duration: this.timeout,
    });
    this.$(".toast-container")!.appendChild(toast.element);
    toast.show();
  }

  success(message: string) {
    this.toast(message, "success");
  }

  info(message: string) {
    this.toast(message, "info");
  }

  danger(message: string) {
    this.toast(message, "danger");
  }

  warning(message: string) {
    this.toast(message, "warning");
  }

  static success(message: string) {
    Toaster.toast(message, "success");
  }

  static info(message: string) {
    Toaster.toast(message, "info");
  }

  static danger(message: string) {
    Toaster.toast(message, "danger");
  }

  static warning(message: string) {
    Toaster.toast(message, "warning");
  }
}
