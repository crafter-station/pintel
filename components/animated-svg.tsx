"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedSVGProps {
	svg: string;
	className?: string;
	animate?: boolean;
	duration?: number; // Total animation duration in ms
}

export function AnimatedSVG({
	svg,
	className,
	animate = true,
	duration = 2000,
}: AnimatedSVGProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isAnimating, setIsAnimating] = useState(animate);

	useEffect(() => {
		if (!containerRef.current || !svg || !isAnimating) return;

		const container = containerRef.current;
		container.innerHTML = svg;

		const svgElement = container.querySelector("svg");
		if (!svgElement) return;

		// Get all drawable elements
		const elements = svgElement.querySelectorAll(
			"path, line, polyline, polygon, circle, ellipse, rect",
		);

		if (elements.length === 0) {
			setIsAnimating(false);
			return;
		}

		const delayPerElement = Math.min(duration / elements.length, 300);

		elements.forEach((el, index) => {
			const element = el as SVGElement;
			const delay = index * delayPerElement;

			// Store original styles
			const originalOpacity = element.style.opacity || "1";
			const originalFill = element.getAttribute("fill");
			const originalStroke = element.getAttribute("stroke");

			// For paths, lines, polylines, polygons - animate stroke
			if (
				element instanceof SVGPathElement ||
				element instanceof SVGLineElement ||
				element instanceof SVGPolylineElement ||
				element instanceof SVGPolygonElement
			) {
				const length = getPathLength(element);

				// Set up stroke animation
				element.style.strokeDasharray = `${length}`;
				element.style.strokeDashoffset = `${length}`;
				element.style.opacity = "0";

				// If no stroke, add a temporary one for animation
				if (!originalStroke || originalStroke === "none") {
					element.setAttribute("stroke", originalFill || "#000");
					element.setAttribute("stroke-width", "2");
				}

				// Animate
				setTimeout(() => {
					element.style.transition = `stroke-dashoffset ${delayPerElement * 2}ms ease-out, opacity 100ms ease-out`;
					element.style.opacity = originalOpacity;
					element.style.strokeDashoffset = "0";

					// After stroke animation, restore fill
					setTimeout(() => {
						element.style.transition = "fill 200ms ease-out";
						if (!originalStroke || originalStroke === "none") {
							element.setAttribute("stroke", "none");
						}
					}, delayPerElement * 2);
				}, delay);
			}
			// For circles, ellipses, rects - fade and scale in
			else if (
				element instanceof SVGCircleElement ||
				element instanceof SVGEllipseElement ||
				element instanceof SVGRectElement
			) {
				element.style.opacity = "0";
				element.style.transform = "scale(0.8)";
				element.style.transformOrigin = "center";
				element.style.transformBox = "fill-box";

				setTimeout(() => {
					element.style.transition = `opacity ${delayPerElement}ms ease-out, transform ${delayPerElement}ms ease-out`;
					element.style.opacity = originalOpacity;
					element.style.transform = "scale(1)";
				}, delay);
			}
		});

		// Mark animation complete
		const totalDuration =
			elements.length * delayPerElement + delayPerElement * 2;
		setTimeout(() => {
			setIsAnimating(false);
		}, totalDuration);
	}, [svg, isAnimating, duration]);

	// If not animating, just render the SVG directly
	if (!animate) {
		return (
			<div
				className={cn("w-full h-full", className)}
				dangerouslySetInnerHTML={{ __html: svg }}
			/>
		);
	}

	return <div ref={containerRef} className={cn("w-full h-full", className)} />;
}

function getPathLength(element: SVGElement): number {
	try {
		if (element instanceof SVGPathElement) {
			return element.getTotalLength();
		}
		if (element instanceof SVGLineElement) {
			const x1 = element.x1.baseVal.value;
			const y1 = element.y1.baseVal.value;
			const x2 = element.x2.baseVal.value;
			const y2 = element.y2.baseVal.value;
			return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
		}
		if (
			element instanceof SVGPolylineElement ||
			element instanceof SVGPolygonElement
		) {
			const points = element.points;
			let length = 0;
			for (let i = 1; i < points.numberOfItems; i++) {
				const p1 = points.getItem(i - 1);
				const p2 = points.getItem(i);
				length += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
			}
			if (element instanceof SVGPolygonElement && points.numberOfItems > 1) {
				const first = points.getItem(0);
				const last = points.getItem(points.numberOfItems - 1);
				length += Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
			}
			return length;
		}
	} catch {
		// Fallback for SSR or errors
	}
	return 1000; // Default length
}
