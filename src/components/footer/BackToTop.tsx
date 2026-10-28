"use client";

import { Icon } from "../Icons";
import { scrollToTop } from "../motion/SmoothScroll";

export default function BackToTop() {
  return (
    <button type="button" className="btn-glass footer__top-btn" onClick={scrollToTop}>
      Back to top
      <Icon name="arrow" size={16} className="footer__up" />
    </button>
  );
}
