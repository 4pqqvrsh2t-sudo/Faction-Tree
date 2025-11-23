// Horizontal (left -> right) collapsible faction tree
// Rewritten to avoid zoom/center conflicts, cap spacing for phones,
// single root pulse on load, retractable nodes, and auto-centering.

const container = document.getElementById("tree-container");

let width = Math.max(320, container.clientWidth);
let height = Math.max(320, container.clientHeight);
const margin = { top: 40, right: 40, bottom: 40, left: 80 };

// --- SVG + zoom setup ---
// We'll apply the zoom transform to gPan only, and use svg.call(zoom.transform, ...) to center.
const svg = d3.select("#tree-container")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const gPan = svg.append("g").attr("class", "g-pan"); // this gets zoom/pan transforms
const g = gPan.append("g").attr("class", "g-tree");  // tree content lives here

// Zoom behavior (limit zoom-out more on phones)
const minScale = width < 500 ? 0.85 : 0.5;
const zoom = d3.zoom()
    .scaleExtent([minScale, 3])
    .on("zoom", (event) => {
        gPan.attr("transform", event.transform);
    });

svg.call(zoom);

// --- Sample hierarchical data (replace with your data object) ---
const data = {
    name: "Federation",
    children: [
        { name: "Faction A", children: [{ name: "Faction A1" }, { name: "Faction A2" }] },
        { name: "Faction B" },
        { name: "Faction C", children: [{ name: "Faction C1" }, { name: "Faction C2" }] }
    ]
};

const root = d3.hierarchy(data);
root.x0 = 0;
root.y0 = 0;

// collapse helper - recursive
function collapseAll(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapseAll);
        d.children = null;
    }
}
collapseAll(root); // collapse everything except the root's immediate visualization (root stays visible)

// --- tree layout (we will set size each update) ---
const treeLayout = d3.tree();

// timing
const TRANS_DUR = 1400; // smooth, slower transitions

// pulse flag so we do pulse only once on load
let pulsed = false;

// initial render & center
update(root);
centerTree(true); // true = initial center (keeps scale)

//////////////////////
// update function
//////////////////////
function update(source) {
    // recalc dimensions (in case of resize)
    width = Math.max(320, container.clientWidth);
    height = Math.max(320, container.clientHeight);
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // determine spacing:
    // maxDepth = number of generations
    const maxDepth = root.height + 1;
    // levelGap = horizontal gap per depth (capped for phones)
    const levelGap = Math.max(60, Math.min(140, Math.floor((width - margin.left - margin.right) / (maxDepth + 1))));
    // vertical grid: how much vertical space we can use
    const xRange = Math.max(200, height - margin.top - margin.bottom);

    // D3 tree size: [verticalRange, horizontalRange] because we'll map x->vertical, y->horizontal
    treeLayout.size([xRange, levelGap * maxDepth]);

    // compute new tree
    const treeData = treeLayout(root);

    // nodes and links
    const nodes = treeData.descendants();
    const links = treeData.links();

    // node sizing
    const nodeRadius = width < 400 ? 10 : width < 700 ? 14 : 18;
    const fontSize = width < 400 ? "10px" : width < 700 ? "12px" : "14px";

    // ---------- LINKS ----------
    const link = g.selectAll("path.link").data(links, d => d.target.data.name);

    // enter
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#8a8a8a")
        .attr("stroke-width", 2)
        .attr("d", d => {
            // start from source (initial animation)
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
        })
        .transition().duration(TRANS_DUR)
        .attr("d", d => diagonal(d.source, d.target));

    // update + exit handled via merge
    link.transition().duration(TRANS_DUR).attr("d", d => diagonal(d.source, d.target));
    link.exit().transition().duration(TRANS_DUR).attr("opacity", 0).remove();

    // ---------- NODES ----------
    const node = g.selectAll("g.node").data(nodes, d => d.data.name);

    // enter
    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`) // y is horizontal, x is vertical
        .on("click", click);

    nodeEnter.append("circle")
        .attr("r", 0)
        .style("fill", d => d.depth === 0 ? "orange" : "#fff")
        .style("stroke", "#f59a2b")
        .style("stroke-width", d => d.depth === 0 ? 3 : 1.5)
        .style("filter", d => d.depth === 0 ? "url(#glow)" : "none")
        .transition().duration(TRANS_DUR)
        .attr("r", d => d.depth === 0 ? nodeRadius * 1.6 : nodeRadius);

    nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.children || d._children ? -12 : 12)
        .attr("text-anchor", d => d.children || d._children ? "end" : "start")
        .text(d => d.data.name)
        .style("fill", "#fff")
        .style("font-size", fontSize)
        .style("opacity", 0)
        .transition().duration(TRANS_DUR).style("opacity", 1);

    // defs (glow) — add only once
    if (svg.select("defs").empty()) {
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "glow");
        filter.append("feGaussianBlur").attr("stdDeviation", 4).attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    }

    // update + exit
    const t = d3.transition().duration(TRANS_DUR);
    node.merge(nodeEnter).transition(t)
        .attr("transform", d => `translate(${d.y},${d.x})`); // note y horizontal, x vertical

    node.exit().transition().duration(TRANS_DUR)
        .attr("opacity", 0).remove();

    // save current positions for transitions
    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

    // root pulse once on first render
    if (!pulsed) {
        pulsed = true;
        const rootCircle = g.selectAll("g.node").filter(d => d && d.depth === 0).select("circle");
        if (!rootCircle.empty()) {
            rootCircle.transition().duration(900).attr("r", nodeRadius * 1.8)
                .transition().duration(900).attr("r", nodeRadius * 1.6);
        }
    }
}

// diagonal curve for horizontal layout (source and target are nodes)
function diagonal(s, d) {
    // s.x (vertical), s.y (horizontal)
    const midX = (s.x + d.x) / 2;
    const midY = (s.y + d.y) / 2;
    return `M ${s.y} ${s.x} C ${midY} ${s.x}, ${midY} ${d.x}, ${d.y} ${d.x}`;
}

// click handler: expand/collapse (collapses descendants when collapsing)
function click(event, d) {
    if (d.children) {
        // collapse all descendants of d
        collapseAll(d);
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
    centerTree();
}

// get max children (used for spacing calculation)
function getMaxChildren(node) {
    let max = 0;
    function recurse(n) {
        const c = (n.children ? n.children.length : 0) + (n._children ? n._children.length : 0);
        max = Math.max(max, c);
        (n.children || n._children || []).forEach(recurse);
    }
    recurse(node);
    return max;
}

// centerTree: compute bbox of visible nodes and move pan (via zoom.transform) so tree is nicely positioned
function centerTree(initial = false) {
    // collect visible node elements
    const nodeEls = g.selectAll("g.node").nodes();
    if (nodeEls.length === 0) return;

    // compute bounding box in screen coords using CTM
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeEls.forEach(el => {
        const bbox = el.getBBox();
        const ctm = el.getCTM();
        // center of bbox in screen coords:
        const cx = ctm.e + bbox.x + bbox.width / 2;
        const cy = ctm.f + bbox.y + bbox.height / 2;
        minX = Math.min(minX, cx - bbox.width / 2);
        maxX = Math.max(maxX, cx + bbox.width / 2);
        minY = Math.min(minY, cy - bbox.height / 2);
        maxY = Math.max(maxY, cy + bbox.height / 2);
    });

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    // desired position: place left edge with a left margin, and vertically centered
    const desiredLeft = margin.left; // px from left of viewport
    const desiredTop = (height - treeHeight) / 2; // center vertically within viewport

    // compute desired translation for gPan (world coordinates)
    // we must find transform that maps current content to desired positions while preserving current scale
    const curTransform = d3.zoomTransform(svg.node());
    const k = curTransform.k;

    // Currently, content at screen X = curTransform.applyX(worldX)
    // We need to find tx so that minX maps to desiredLeft: desiredLeft = k * minX + tx
    // => tx = desiredLeft - k * minX
    const tx = desiredLeft - k * minX;
    const ty = desiredTop - k * minY;

    const newTransform = d3.zoomIdentity.translate(tx, ty).scale(k);

    if (initial) {
        // instantly set transform (no anim) for initial load
        svg.call(zoom.transform, newTransform);
    } else {
        svg.transition().duration(800).call(zoom.transform, newTransform);
    }
}

// handle resize: recompute sizes and re-render and recenter
window.addEventListener("resize", () => {
    width = Math.max(320, container.clientWidth);
    height = Math.max(320, container.clientHeight);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    update(root);
    centerTree();
});
