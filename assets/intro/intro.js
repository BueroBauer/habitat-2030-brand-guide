/* Habitat 2030 Intro
   Ersetzt initIntroAnimation() in js/app.js. Alte Funktion UND ihren Aufruf im DOMContentLoaded-Block von app.js
   löschen, diese Datei startet sich selbst (sonst läuft das Intro doppelt).
   Braucht gsap + ScrollTrigger (im Theme vorhanden). Nutzt nur vorhandene Elemente:
   .intro h1, .line-container, .line, .claim. Kein neues Markup. */

// Diagonale der Linie, identisch zur Live-Seite (app.js): 75 % Breite, volle Höhe des Containers.
function lineGeometry(container) {
	const r = container.getBoundingClientRect();
	const w = r.width * 0.75;
	return { degrees: 90 - Math.atan(w / r.height) * (180 / Math.PI), length: Math.hypot(w, r.height) };
}

function initIntroScroll() {
	const container = document.querySelector(".intro .line-container");
	const line = container.querySelector(".line");

	// Funktionswerte + invalidateOnRefresh: Länge/Winkel werden bei Resize neu aus dem Layout berechnet
	return gsap.fromTo(line,
		{ rotate: () => lineGeometry(container).degrees, width: () => lineGeometry(container).length },
		{
			rotate: 0,
			width: "100%",
			ease: "none",
			scrollTrigger: {
				trigger: container,
				start: () => window.matchMedia("(max-width: 767.98px)").matches ? "top top" : "top center-=200",
				end: "bottom center",
				scrub: true,
				invalidateOnRefresh: true
			}
		}
	);
}

let introTl = null;

function initIntroAnimation() {
	const intro = document.querySelector(".intro");
	if (!intro) return false;

	const root = document.documentElement;
	const container = intro.querySelector(".line-container");
	const line = container.querySelector(".line");
	const [left, right] = intro.querySelectorAll("h1");
	const claim = intro.querySelector(".claim");

	const finish = () => {
		gsap.set(line, { scaleX: 1, willChange: "auto" });
		root.classList.add("intro-ready");
		root.style.overflow = "";
		root.style.scrollbarGutter = "";
		initIntroScroll();
		ScrollTrigger.refresh();
	};

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return finish();
	}

	window.scrollTo(0, 0);
	root.style.overflow = "hidden";
	root.style.scrollbarGutter = "stable"; // Scrollbar-Breite halten, sonst ändern sich alle Maße

	// Textbreite per Range, weil h1 volle Breite hat
	const textRect = (el) => {
		const r = document.createRange();
		r.selectNodeContents(el);
		return r.getBoundingClientRect();
	};

	const remPx = parseFloat(getComputedStyle(root).fontSize);
	const mobile = window.matchMedia("(max-width: 767.98px)").matches;
	const spacePx = 0.28 * parseFloat(getComputedStyle(left).fontSize); // Wortabstand Screen 1

	// Endlayout messen (so wie die Seite ohne Intro aussieht)
	const lc = container.getBoundingClientRect();
	const hR = textRect(left);
	const tR = textRect(right);
	const centerY = lc.top + lc.height / 2;
	const lcCenterX = lc.left + lc.width / 2;

	// Startposition Screen 1: "Habitat 2030" in einer Zeile auf Höhe der Linie
	const hY = centerY - (hR.top + hR.height / 2);
	const tY = centerY - (tR.top + tR.height / 2);
	// Mobil: eine Zeile muss in den Viewport passen, sonst Skalierung (Ursprung links)
	const avail = document.documentElement.clientWidth - 2 * remPx * 1.75;
	const sc = mobile ? Math.min(1, avail / (hR.width + spacePx + tR.width)) : 1;
	const tStartLeft = hR.left + (hR.width + spacePx) * sc;
	const tX = tStartLeft - tR.left;

	// Abstand Text zu Linie (Screen 2): 2.5rem, auf schmalen Screens max. 1/4 des freien Platzes
	const free = tR.left - hR.right;
	const gapPx = Math.max(Math.min(2.5 * remPx, free * 0.25), 0);

	// Linie Screen 2: zwischen den Texten
	const lineStartX = (hR.left + hR.width * sc + tStartLeft) / 2 - lcCenterX;
	const lineMidX = (hR.right + gapPx + tR.left - gapPx) / 2 - lcCenterX;
	const lineMidW = (tR.left - gapPx) - (hR.right + gapPx);

	// Endzustand = exakt der Zustand, den der Scroll-Effekt der Seite beim Laden hat (Scrub steht dort nicht bei 0)
	// Start- und Endwerte des Scroll-Effekts + Fortschritt beim Laden, linear interpoliert (ease none)
	const probe = initIntroScroll();
	ScrollTrigger.refresh();
	const p = probe.scrollTrigger.progress;
	probe.scrollTrigger.kill();
	probe.kill();
	gsap.set(line, { clearProps: "all" });
	const g = lineGeometry(container);
	const degrees = g.degrees * (1 - p);
	const length = g.length + (lc.width - g.length) * p;

	gsap.set(left, { y: hY, scale: sc, transformOrigin: "0 50%" });
	gsap.set(right, { x: tX, y: tY, scale: sc, transformOrigin: (tR.left - right.getBoundingClientRect().left) + "px 50%" }); // Ursprung = linke Textkante, h1 hat volle Breite
	// Breite fix auf Endlänge, Wachsen/Schrumpfen per scaleX (Compositor statt Layout pro Frame)
	gsap.set(line, { xPercent: -50, yPercent: -50, x: lineStartX, width: length, scaleX: 0, rotate: 0, force3D: true, willChange: "transform" });
	gsap.set(container, { "--edge": 0 });
	gsap.set(claim, { autoAlpha: 0 }); // nur Opacity, CSS-transform des Claims bleibt unangetastet
	gsap.set([left, right], { autoAlpha: 0 });
	root.classList.add("intro-ready");

	// Mobil etwas straffer
	const k = mobile ? 0.85 : 1;
	const tl = gsap.timeline({ delay: 0.3, onComplete: finish, paused: false });
	tl.timeScale(1 / k);

	introTl = tl;

	// 0: Wort blendet sanft ein
	tl.to([left, right], { autoAlpha: 1, duration: 1.8, ease: "power2.inOut" })

	// 1 → 2 → 3
	if (mobile) {
	  // Kein Platz zum Auseinanderfahren: Linie entsteht, während die Wörter auf der y-Achse wechseln
	  tl.to([left, right], { y: 0, scale: 1, duration: 1.2, ease: "power3.inOut" }, "+=0.35")
	    .to(right, { x: 0, duration: 1.2, ease: "power3.inOut" }, "<")
	    .to(line, { x: 0, scaleX: 1, rotate: degrees, duration: 1.2, ease: "power3.inOut" }, "<0.1");
	} else {
	  // 1 → 2: Text fährt auseinander, Linie entsteht
	  tl.to(right, { x: 0, duration: 1, ease: "expo.inOut" }, "+=0.35")
	    .to(line, { x: lineMidX, scaleX: lineMidW / length, duration: 1, ease: "expo.inOut" }, "<")
	    // 2 → 3: Texte wechseln auf der y-Achse, Linie dreht
	    .to([left, right], { y: 0, duration: 1.1, ease: "power3.inOut" }, "+=0.15")
	    .to(line, { x: 0, scaleX: 1, rotate: degrees, duration: 1.1, ease: "power3.inOut" }, "<");
	}

	// 3 → 4: Randlinien wachsen aus der Mitte
	tl.to(container, { "--edge": 1, duration: 0.7, ease: "power3.out" }, "-=0.1")
	  .to(claim, { autoAlpha: 1, duration: 0.8, ease: "power1.out" }, "-=0.3");

	// Failsafe: nie dauerhaft versteckt
	setTimeout(() => root.classList.add("intro-ready"), 1500);
}

// Resize/Drehen: laufendes Intro sofort beenden (Maße stimmen nicht mehr), danach nur Scroll-Effekt neu berechnen
let resizeTimer;
window.addEventListener("resize", () => {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		const intro = document.querySelector(".intro");
		if (!intro) return;
		if (introTl && introTl.progress() < 1) {
			introTl.kill();
			const els = intro.querySelectorAll("h1, .line, .claim, .line-container");
			gsap.set(els, { clearProps: "all" });
			document.documentElement.classList.add("intro-ready");
			document.documentElement.style.overflow = "";
			document.documentElement.style.scrollbarGutter = "";
			initIntroScroll();
		}
		ScrollTrigger.refresh();
	}, 150);
});

document.addEventListener("DOMContentLoaded", () => {
	// Schrift abwarten, sonst stimmen die Maße nicht
	(document.fonts ? document.fonts.ready : Promise.resolve()).then(initIntroAnimation);
});
