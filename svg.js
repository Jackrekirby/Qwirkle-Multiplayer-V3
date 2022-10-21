function svg(color, d, viewBox) {
    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const iconPath = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
    );

    iconPath.setAttribute(
        'd', d
    );
    iconSvg.setAttribute('viewBox', viewBox);
    iconSvg.setAttribute('fill', color);
    // iconSvg.setAttribute('stroke', 'white');
    // iconSvg.setAttribute('stroke-width', '50');
    // iconSvg.setAttribute('line-cap', 'round');
    iconSvg.appendChild(iconPath);
    return iconSvg;
}

export default svg;
