// Reusable anime.js helper utilities
import { animate, stagger, createTimeline } from "animejs";

// Check if we're in browser environment
const isBrowser = typeof window !== "undefined";

// Typewriter effect animation for text
export function typewriterEffect(
  element: HTMLElement,
  text: string,
  options: Partial<{
    duration: number;
    delay: number;
    ease: string;
  }> = {}
) {
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  const { duration = 2000, delay = 0, ease = "linear" } = options;

  // Split text into characters
  element.innerHTML = text
    .split("")
    .map(
      (char) =>
        `<span class="char" style="opacity: 0;">${
          char === " " ? "&nbsp;" : char
        }</span>`
    )
    .join("");

  const chars = element.querySelectorAll(".char");

  try {
    return animate(chars, {
      opacity: [0, 1],
      duration: duration / chars.length,
      delay: stagger(duration / chars.length, { start: delay }),
      ease,
    });
  } catch (error) {
    console.warn("Typewriter animation failed:", error);
    return { pause: () => {} };
  }
}

// Glitch reveal effect
export function glitchReveal(
  element: HTMLElement,
  options: Partial<{
    duration: number;
    intensity: number;
  }> = {}
) {
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  const { duration = 1000, intensity = 10 } = options;

  try {
    const tl = createTimeline();

    // Multiple glitch passes
    for (let i = 0; i < 3; i++) {
      tl.add(element, {
        translateX: [
          -intensity,
          intensity,
          -intensity / 2,
          intensity / 2,
          0,
        ],
        duration: duration / 6,
        ease: "linear",
      });
    }

    tl.add(
      element,
      {
        opacity: [0, 1],
        duration: duration / 3,
      },
      0
    );

    return tl;
  } catch (error) {
    console.warn("Glitch reveal failed:", error);
    return { pause: () => {} };
  }
}

// Bounce reveal from top
export function bounceReveal(
  targets: Element | Element[] | NodeListOf<Element>,
  options: Partial<{
    delay: number;
    distance: number;
    duration: number;
  }> = {}
) {
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  const { delay = 0, distance = 100, duration = 800 } = options;

  try {
    return animate(targets, {
      translateY: [-distance, 0],
      opacity: [0, 1],
      duration,
      delay: typeof delay === "number" ? stagger(delay) : delay,
      ease: "outElastic(1, .8)",
    });
  } catch (error) {
    console.warn("Bounce reveal failed:", error);
    return { pause: () => {} };
  }
}

// Fade and scale reveal
export function fadeScaleReveal(
  targets: Element | Element[] | NodeListOf<Element>,
  options: Partial<{
    delay: number;
    scale: [number, number];
    duration: number;
    ease: string;
  }> = {}
) {
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  const {
    delay = 0,
    scale = [0.8, 1],
    duration = 600,
    ease = "outQuad",
  } = options;

  try {
    return animate(targets, {
      opacity: [0, 1],
      scale,
      duration,
      delay: typeof delay === "number" ? stagger(delay) : delay,
      ease,
    });
  } catch (error) {
    console.warn("Fade scale reveal failed:", error);
    return { pause: () => {} };
  }
}

// Rotate reveal effect
export function rotateReveal(
  targets: Element | Element[] | NodeListOf<Element>,
  options: Partial<{
    delay: number;
    rotation: number;
    duration: number;
  }> = {}
) {
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  const { delay = 0, rotation = 90, duration = 800 } = options;

  try {
    return animate(targets, {
      rotateY: [rotation, 0],
      opacity: [0, 1],
      duration,
      delay: typeof delay === "number" ? stagger(delay) : delay,
      ease: "outQuart",
    });
  } catch (error) {
    console.warn("Rotate reveal failed:", error);
    return { pause: () => {} };
  }
}

// Slide in from side
export function slideReveal(
  targets: Element | Element[] | NodeListOf<Element>,
  options: Partial<{
    delay: number;
    direction: "left" | "right" | "top" | "bottom";
    distance: number;
    duration: number;
  }> = {}
) {
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  const { delay = 0, direction = "left", distance = 50, duration = 600 } = options;

  const transforms: any = {
    opacity: [0, 1],
    duration,
    delay: typeof delay === "number" ? stagger(delay) : delay,
    ease: "outCubic",
  };

  if (direction === "left") {
    transforms.translateX = [-distance, 0];
  } else if (direction === "right") {
    transforms.translateX = [distance, 0];
  } else if (direction === "top") {
    transforms.translateY = [-distance, 0];
  } else {
    transforms.translateY = [distance, 0];
  }

  try {
    return animate(targets, transforms);
  } catch (error) {
    console.warn("Slide reveal failed:", error);
    return { pause: () => {} };
  }
}

// Basic staggered entrance for a NodeList or array of Elements
export function enterStagger(
  targets: Element[] | NodeListOf<Element>,
  options: Partial<{
    delay: number;
    translateY: [number, number];
    opacity: [number, number];
    duration: number;
    ease: string;
  }> = {}
) {
  // Skip animation on server
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  const {
    delay = 60,
    translateY = [24, 0],
    opacity = [0, 1],
    duration = 600,
    ease = "inOut(2)",
  } = options;

  try {
    return animate(targets, {
      opacity,
      translateY,
      duration,
      delay: stagger(delay),
      ease,
    });
  } catch (error) {
    console.warn("enterStagger animation failed:", error);
    return { pause: () => {} };
  }
}

// Hover tilt effect
export function attachHoverTilt(el: HTMLElement, intensity = 8) {
  // Skip on server
  if (!isBrowser || !animate) {
    return () => {};
  }

  const handleMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = (y / rect.height - 0.5) * intensity;
    const ry = (x / rect.width - 0.5) * -intensity;

    try {
      animate(el, {
        rotateX: rx,
        rotateY: ry,
        duration: 300,
        ease: "outQuad",
      });
    } catch (error) {
      console.warn("Tilt animation failed:", error);
    }
  };

  const reset = () => {
    try {
      animate(el, {
        rotateX: 0,
        rotateY: 0,
        duration: 500,
        ease: "outElastic(1, .6)",
      });
    } catch (error) {
      console.warn("Tilt reset failed:", error);
    }
  };
  el.addEventListener("mousemove", handleMove);
  el.addEventListener("mouseleave", reset);
  return () => {
    el.removeEventListener("mousemove", handleMove);
    el.removeEventListener("mouseleave", reset);
  };
}

// Pulse loop (returns controller)
export function pulse(el: HTMLElement, scale = 1.03, duration = 1600) {
  if (!isBrowser || !animate) {
    return { pause: () => {} };
  }

  try {
    return animate(el, {
      scale: [1, scale],
      alternate: true,
      ease: "inOutSine",
      loop: true,
      duration,
    });
  } catch (error) {
    console.warn("Pulse animation failed:", error);
    return { pause: () => {} };
  }
}

// Flash glow utility
export function flash(el: HTMLElement, color = "rgba(16,185,129,0.55)") {
  if (!isBrowser || !animate || !document) {
    return;
  }

  try {
    const overlay = document.createElement("span");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.pointerEvents = "none";
    overlay.style.borderRadius = "inherit";
    overlay.style.boxShadow = `0 0 0 0 ${color}`;
    el.appendChild(overlay);

    animate(overlay, {
      boxShadow: [`0 0 0 0 ${color}`, `0 0 0 8px rgba(16,185,129,0)`],
      duration: 600,
      ease: "outQuad",
      onComplete: () => overlay.remove(),
    });
  } catch (error) {
    console.warn("Flash animation failed:", error);
  }
}

// Confetti/particles explosion effect
export function confetti(el: HTMLElement, count = 15) {
  if (!isBrowser || !animate || !document) return;

  const colors = ["#10b981", "#34d399", "#6ee7b7", "#a3e635", "#84cc16"];
  const rect = el.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.style.position = "absolute";
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    particle.style.width = "8px";
    particle.style.height = "8px";
    particle.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.pointerEvents = "none";
    particle.style.zIndex = "100";
    el.appendChild(particle);

    const angle = (Math.PI * 2 * i) / count;
    const velocity = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;

    animate(particle, {
      translateX: [0, tx],
      translateY: [0, ty],
      scale: [1, 0],
      rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
      opacity: [1, 0],
      duration: 800 + Math.random() * 400,
      ease: "outQuad",
      onComplete: () => particle.remove(),
    });
  }
}

// Number pop effect
export function numberPop(el: HTMLElement, value: number, color = "#10b981") {
  if (!isBrowser || !document) return;

  const popup = document.createElement("div");
  popup.textContent = `+${value}`;
  popup.style.position = "absolute";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.fontSize = "2rem";
  popup.style.fontWeight = "900";
  popup.style.color = color;
  popup.style.pointerEvents = "none";
  popup.style.zIndex = "1000";
  popup.style.textShadow = `0 0 10px ${color}`;
  el.appendChild(popup);

  animate(popup, {
    translateY: [0, -60],
    scale: [0.5, 1.2, 0],
    opacity: [0, 1, 0],
    duration: 1200,
    ease: "outQuad",
    onComplete: () => popup.remove(),
  });
}

// Shockwave effect
export function shockwave(el: HTMLElement, color = "rgba(16,185,129,0.3)") {
  if (!isBrowser || !animate || !document) return;

  const wave = document.createElement("div");
  wave.style.position = "absolute";
  wave.style.top = "50%";
  wave.style.left = "50%";
  wave.style.width = "20px";
  wave.style.height = "20px";
  wave.style.borderRadius = "50%";
  wave.style.border = `3px solid ${color}`;
  wave.style.transform = "translate(-50%, -50%)";
  wave.style.pointerEvents = "none";
  wave.style.zIndex = "50";
  el.appendChild(wave);

  animate(wave, {
    scale: [1, 8],
    opacity: [0.8, 0],
    duration: 800,
    ease: "outQuad",
    onComplete: () => wave.remove(),
  });
}

// Glow pulse on milestone
export function milestonePulse(el: HTMLElement) {
  if (!isBrowser || !animate) return;

  const tl = createTimeline();

  // Triple pulse effect
  tl.add(el, {
    scale: [1, 1.15, 1],
    boxShadow: [
      "0 0 0px rgba(16,185,129,0)",
      "0 0 40px rgba(16,185,129,0.8)",
      "0 0 0px rgba(16,185,129,0)",
    ],
    duration: 400,
  });

  tl.add(el, {
    scale: [1, 1.1, 1],
    duration: 300,
  });

  tl.add(el, {
    scale: [1, 1.08, 1],
    duration: 250,
  });

  return tl;
}
