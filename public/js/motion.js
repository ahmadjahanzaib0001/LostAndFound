/* =====================================================================
   MOTION.JS - Intersection Observer Scroll Animations
   ===================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    // Enable reveal animations on scroll
    document.documentElement.classList.add("js");

    const observerOptions = {
        root: null,
        rootMargin: "0px 0px -100px 0px", // Triggers slightly before the element enters the screen
        threshold: 0.12
    };

    const handleIntersect = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
                // Optional: stop observing once animated
                // observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);
    
    // Select all elements designated to reveal on scroll
    const revealElements = document.querySelectorAll(".reveal, .steps, .side, .collect, .admin-strip, .faq, .mail-card");
    revealElements.forEach(el => observer.observe(el));
});
/* Keep pointer tilt on the tag so the wrapper's swing animation owns its transform. */
const tag = document.querySelector(".tag");
if (tag && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    tag.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;

        const bounds = tag.getBoundingClientRect();
        const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
        const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
        tag.style.setProperty("--tag-tilt-x", `${(-offsetY * 8).toFixed(2)}deg`);
        tag.style.setProperty("--tag-tilt-y", `${(offsetX * 8).toFixed(2)}deg`);
    });

    tag.addEventListener("pointerleave", () => {
        tag.style.setProperty("--tag-tilt-x", "0deg");
        tag.style.setProperty("--tag-tilt-y", "0deg");
    });
}