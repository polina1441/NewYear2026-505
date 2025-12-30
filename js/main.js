document.addEventListener("DOMContentLoaded", () => {
    const cardStack = document.querySelector(".card-stack");
    let cards = Array.from(document.querySelectorAll(".card"));

    let isSwiping = false;
    let startX = 0;
    let currentX = 0;
    let rafId = null;
    let activePointerId = null;

    const getDurationFromCSS = (varName, el = document.documentElement) => {
        const v = getComputedStyle(el).getPropertyValue(varName).trim();
        if (!v) return 0;
        if (v.endsWith("ms")) return parseFloat(v);
        if (v.endsWith("s")) return parseFloat(v) * 1000;
        return parseFloat(v) || 0;
    };

    const duration = () => getDurationFromCSS("--card-swap-duration");

    const getActiveCard = () => cards[0];

    const updatePositions = () => {
        cards.forEach((card, i) => {
            card.style.setProperty("--i", i);
            card.style.setProperty("--swipe-x", "0px");
            card.style.setProperty("--swipe-rotate", "0deg");
            card.style.opacity = "1";

            // контент виден только на верхней карточке
            const isActive = i === 0;
            card.classList.toggle("is-active", isActive);
            card.classList.toggle("is-behind", !isActive);
            card.setAttribute("aria-hidden", (!isActive).toString());
        });
    };

    const applySwipeStyles = (deltaX) => {
        const card = getActiveCard();
        if (!card) return;

        card.style.setProperty("--swipe-x", `${deltaX}px`);
        card.style.setProperty("--swipe-rotate", `${deltaX * 0.18}deg`);

        const fade = 1 - Math.min(Math.abs(deltaX) / 120, 1) * 0.75;
        card.style.opacity = String(fade);
    };

    const ignoreTarget = (target) =>
        !!target.closest("button, a, input, textarea, select, label");

    const handleStart = (e) => {
        if (isSwiping) return;
        if (ignoreTarget(e.target)) return;

        isSwiping = true;
        activePointerId = e.pointerId;
        startX = currentX = e.clientX;

        const card = getActiveCard();
        if (card) {
            card.style.transition = "none";
            card.setPointerCapture?.(activePointerId);
        }
    };

    const handleMove = (e) => {
        if (!isSwiping) return;
        if (activePointerId !== e.pointerId) return;

        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            currentX = e.clientX;
            const dx = currentX - startX;
            applySwipeStyles(dx);

            // если резко утащили — автоматически “досвайп”
            if (Math.abs(dx) > 70) handleEnd();
        });
    };

    const swipeOut = (direction = 1) => {
        const card = getActiveCard();
        if (!card) return;

        const d = duration();
        card.style.transition = `transform ${d}ms ease, opacity ${d}ms ease`;

        card.style.setProperty("--swipe-x", `${direction * 340}px`);
        card.style.setProperty("--swipe-rotate", `${direction * 18}deg`);
        card.style.opacity = "0.25";

        setTimeout(() => {
            // перекидываем карточку в конец
            cards = [...cards.slice(1), card];
            updatePositions();
        }, d);
    };

    const handleEnd = () => {
        if (!isSwiping) return;

        cancelAnimationFrame(rafId);

        const dx = currentX - startX;
        const threshold = 70;

        const card = getActiveCard();
        if (card) {
            card.style.transition = `transform ${duration()}ms ease, opacity ${duration()}ms ease`;

            if (Math.abs(dx) > threshold) {
                swipeOut(Math.sign(dx));
            } else {
                applySwipeStyles(0);
            }

            try { card.releasePointerCapture?.(activePointerId); } catch(_) {}
        }

        isSwiping = false;
        activePointerId = null;
        startX = currentX = 0;
    };

    // listeners
    cardStack.addEventListener("pointerdown", handleStart);
    cardStack.addEventListener("pointermove", handleMove);
    cardStack.addEventListener("pointerup", handleEnd);
    cardStack.addEventListener("pointercancel", handleEnd);

    // кнопки "Далее/Получить" — тоже листают
    document.querySelectorAll(".js-next").forEach((btn) => {
        btn.addEventListener("click", () => swipeOut(1));
        btn.addEventListener("pointerdown", (e) => e.stopPropagation());
    });

    // reset (вернуть сначала)
    const resetBtn = document.querySelector(".js-reset");
    resetBtn?.addEventListener("click", () => {
        // простой ресет: отсортируем по порядку в DOM
        cards = Array.from(document.querySelectorAll(".card"));
        updatePositions();
    });
    resetBtn?.addEventListener("pointerdown", (e) => e.stopPropagation());

    updatePositions();
});
