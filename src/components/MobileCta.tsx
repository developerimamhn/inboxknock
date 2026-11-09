"use client";

import { useEffect, useState } from "react";

/** Sticky "Check an email" on phones, shown only after the hero checker leaves the screen. */
export function MobileCta({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById("check");
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      threshold: 0,
    });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className="sticky-cta pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
      data-show={show}
      inert={!show}
    >
      <a href="#check" className="btn btn-lg pointer-events-auto w-full shadow-[0_10px_30px_rgba(0,0,0,0.5)]" data-focus-check>
        {text}
      </a>
    </div>
  );
}
