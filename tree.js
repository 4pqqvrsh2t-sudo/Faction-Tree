const container = document.getElementById("tree-container");

let width = Math.max(320, container.clientWidth);
let height = Math.max(320, container.clientHeight);
const margin = { top: 40, right: 40, bottom: 40, left: 40 };

// SVG + zoom setup
const svg = d3.select("#tree-container")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const gPan = svg.append("g").attr("class", "g-pan"); // zoom/pan container
const g = gPan.append("g").attr("class", "g-tree"); // tree content

const minScale = width < 500 ? 0.8 : 0.5;
const zoom = d3.zoom()
    .scaleExtent([minScale, 3])
    .on("zoom", (event) => gPan.attr("transform", event.transform));
svg.call(zoom);

// Sample hierarchical data
const data = {
    name: "Federation",
    children: [
        { name: "Faction A", children: [{ name: "Faction A1" }, { name: "Faction A2" }] },
        { name: "Faction B" },
        { name: "Faction C", children: [{ name: "Faction C1" }] }
    ]
};

const root = d3.hierarchy(data);
root.x0 = 0;
root.y0 = 0;

// Collapse helper
function collapseAll(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapseAll);
        d.children = null;
    }
}
collapseAll(root);

const treeLayout = d3.tree();
const TRANS_DUR = 1400;
let pulsed = false;

update(root);
centerTree(true); // initial center

function update(source) {
    width = Math.max(320, container.clientWidth);
    height = Math.max(320, container.clientHeight);
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const maxDepth = root.height + 1;
    const levelGap = Math.max(60, Math.min(140, Math.floor((width - margin.left - margin.right) / (maxDepth + 1))));
    const xRange = Math.max(200, height - margin.top - margin.bottom);

    treeLayout.size([xRange, levelGap * maxDepth]);

    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    const nodeRadius = width < 400 ? 10 : width < 700 ? 14 : 18;
    const fontSize = width < 400 ? "10px" : width < 700 ? "12px" : "14px";

    // LINKS
    const link = g.selectAll("path.link").data(links, d => d.target.data.name);
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#888")
        .attr("stroke-width", 2)
        .attr("d", d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
        })
        .transition().duration(TRANS_DUR)
        .attr("d", d => diagonal(d.source, d.target));
    link.transition().duration(TRANS_DUR).attr("d", d => diagonal(d.source, d.target));
    link.exit().transition().duration(TRANS_DUR).attr("opacity", 0).remove();

    // NODES
    const node = g.selectAll("g.node").data(nodes, d => d.data.name);
    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on("click", click);

    nodeEnter.append("circle")
        .attr("r", 0)
        .style("fill", d => d.depth === 0 ? "orange" : "#fff")
        .style("stroke", "#f90")
        .style("stroke-width", d => d.depth === 0 ? 3 : 1.5)
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
        .transition().duration(TRANS_DUR)
        .style("opacity", 1);

    const t = d3.transition().duration(TRANS_DUR);
    node.merge(nodeEnter).transition(t).attr("transform", d => `translate(${d.y},${d.x})`);
    node.exit().transition(t).attr("opacity", 0).remove();

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

    // root pulse once
    if (!pulsed) {
        pulsed = true;
        const rootCircle = g.selectAll("g.node").filter(d => d.depth === 0).select("circle");
        rootCircle.transition().duration(900).attr("r", nodeRadius * 1.8)
            .transition().duration(900).attr("r", nodeRadius * 1.6);
    }

    centerTree(); // call after update to adjust view
}

// Diagonal function
function diagonal(s, d) {
    const midX = (s.x + d.x) / 2;
    const midY = (s.y + d.y) / 2;
    return `M ${s.y} ${s.x} C ${midY} ${s.x}, ${midY} ${d.x}, ${d.y} ${d.x}`;
}

// Click expand/collapse
function click(event, d) {
    if (d.children) collapseAll(d), d.children = null;
    else d.children = d._children, d._children = null;
    update(d);
}

// Center the tree (keeps root roughly center)
function centerTree(initial = false) {
    const rootNode = g.selectAll("g.node").filter(d => d.depth === 0).node();
    if (!rootNode) return;
    const bbox = rootNode.getBBox();
    const curTransform = d3.zoomTransform(svg.node());
    const k = curTransform.k;

    // center root in viewport
    const tx = width / 2 - (bbox.x + bbox.width / 2) * k;
    const ty = height / 2 - (bbox.y + bbox.height / 2) * k;
    const newTransform = d3.zoomIdentity.translate(tx, ty).scale(k);

    if (initial) svg.call(zoom.transform, newTransform);
    else svg.transition().duration(800).call(zoom.transform, newTransform);
}

// resize handling
window.addEventListener("resize", () => {
    width = Math.max(320, container.clientWidth);
    height = Math.max(320, container.clientHeight);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    update(root);
});
