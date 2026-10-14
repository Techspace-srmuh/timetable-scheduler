declare module "scrollmagic" {
  export interface SceneEvent {
    scrollDirection: "PAUSED" | "FORWARD" | "REVERSE";
  }

  export class Controller {
    constructor(options?: {
      loglevel?: number;
      refreshInterval?: number;
    });
    destroy(resetScenes?: boolean): void;
  }

  export class Scene {
    constructor(options?: {
      triggerElement?: HTMLElement;
      triggerHook?: number;
      reverse?: boolean;
    });
    on(eventName: "enter", callback: (event: SceneEvent) => void): this;
    addTo(controller: Controller): this;
  }

  const ScrollMagic: {
    Controller: typeof Controller;
    Scene: typeof Scene;
  };

  export default ScrollMagic;
}
