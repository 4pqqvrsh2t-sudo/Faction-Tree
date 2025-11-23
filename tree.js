const container = document.getElementById("tree-container");

let width = container.clientWidth;
let height = container.clientHeight;

// SVG container
const svg = d3.select("#tree-container")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .call(d3.zoom()
        .scaleExtent([width < 500 ? 0.8 : 0.5, 3]) // limited zoom for phones
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, 50)`);

// Sample tree data
const data = {
    name: "Federation",
    children: [
        { name: "Faction A", children: [{ name: "Faction A1" }, { name: "Faction A2" }] },
        { name: "Faction B" },
        { name: "Faction C", children: [{ name: "Faction C1" }] }
    ]
};

const root = d3.hierarchy(data);
root.x0 = width / 2;
root.y0 = 0;

// Collapse all descendants
function collapseAll(d) {
    if(d.children) {
        d._children = d.children;
        d._children.forEach(collapseAll);
        d.children = null;
    }
}
collapseAll(root);

const initialScale = width < 500 ? 0.7 : 1;

// Tree layout
let treeLayout = d3.tree();

// Initial render
update(root);
centerTree();

// Click to expand/collapse recursively
function click(event, d) {
    if(d.children) {
        collapseAll(d);
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
    centerTree();
}

// Main update function
function update(source) {
    const maxDepth = root.height + 1;
    const maxChildren = getMaxChildren(root);
    const horizontalSpacing = Math.min(150, width / (maxChildren + 1));
    const verticalSpacing = Math.min((height - 150) / maxDepth, 100); // capped vertical spacing

    treeLayout.size([horizontalSpacing * maxChildren, verticalSpacing * maxDepth]);

    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    const nodeRadius = width < 400 ? 12 : width < 700 ? 15 : 20;
    const fontSize = width < 400 ? "10px" : width < 700 ? "12px" : "14px";

    // Nodes
    const node = g.selectAll(".node").data(nodes, d => d.data.name);
    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.x0},${source.y0})`)
        .on("click", click);

    nodeEnter.append("circle")
        .attr("r", 0)
        .style("fill", d => d.depth === 0 ? "orange" : "#fff")
        .style("stroke", "#f90")
        .style("stroke-width", d => d.depth === 0 ? 4 : 2)
        .transition().duration(1800)
        .attr("r", d => d.depth === 0 ? nodeRadius * 1.5 : nodeRadius);

    nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.children || d._children ? -12 : 12)
        .attr("text-anchor", d => d.children || d._children ? "end" : "start")
        .text(d => d.data.name)
        .style("fill", "#fff")
        .style("font-size", fontSize)
        .style("opacity", 0)
        .transition().duration(1800)
        .style("opacity", 1);

    // Links
    const link = g.selectAll(".link").data(links, d => d.target.data.name);
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#888")
        .attr("stroke-width", 2)
        .attr("d", d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
        })
        .transition().duration(1800)
        .attr("d", d => diagonal(d.source, d.target));

    const t = d3.transition().duration(1800);
    node.merge(nodeEnter).transition(t).attr("transform", d => `translate(${d.x},${d.y})`);
    link.merge(link.enter()).transition(t).attr("d", d => diagonal(d.source, d.target));

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

    // Root subtle pulse only once on load
    svg.selectAll("circle").filter(d => d && d.depth === 0)
        .transition().duration(1000)
        .attr("r", nodeRadius*1.6)
        .transition().duration(1000)
        .attr("r", nodeRadius*1.5);
}

// Diagonal function
function diagonal(s, d) {
    return `M ${s.x} ${s.y} C ${s.x} ${(s.y + d.y)/2}, ${d.x} ${(s.y + d.y)/2}, ${d.x} ${d.y}`;
}

// Calculate maximum children recursively
function getMaxChildren(d) {
    let max = d.children ? d.children.length : 0;
    if(d.children) d.children.forEach(c => { max = Math.max(max, getMaxChildren(c)); });
    if(d._children) d._children.forEach(c => { max = Math.max(max, getMaxChildren(c)); });
    return max;
}

// Center the tree after update
function centerTree() {
    const nodes = g.selectAll(".node").nodes();
    if(nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
        const bbox = n.getBBox();
        const x = n.getCTM().e + bbox.x + bbox.width/2;
        const y = n.getCTM().f + bbox.y + bbox.height/2;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const offsetX = (width - treeWidth) / 2 - minX;
    const offsetY = (height - treeHeight) / 2 - minY;

    g.transition().duration(800)
        .attr("transform", `translate(${offsetX + width/2}, ${offsetY + 50}) scale(${initialScale})`);
}

// Responsive
window.addEventListener("resize", () => {
    width = container.clientWidth;
    height = container.clientHeight;
    update(root);
    centerTree();
});
