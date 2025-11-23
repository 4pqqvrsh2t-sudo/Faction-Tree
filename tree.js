// Mobile/Chromebook-friendly vertical tree with collapsed nodes and pulsing orb
const container = document.getElementById("tree-container");

let width = container.clientWidth;
let height = container.clientHeight;

// Adaptive node radius
function getNodeRadius(depth) {
    if (width < 400) return depth === 0 ? 12 : 6;
    if (width < 700) return depth === 0 ? 18 : 9;
    return depth === 0 ? 25 : 12;
}

// SVG container
const svg = d3.select("#tree-container")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .call(d3.zoom()
        .scaleExtent([0.5, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

// Group to hold tree
const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, 80)`); // Root near top

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

// Collapse all children initially
root.children.forEach(collapse);

const treeLayout = d3.tree().size([getHorizontalSpacing(), getVerticalSpacing()]);

// Initialize tree
update(root);

// COLLAPSE function
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

// UPDATE function
function update(source) {
    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

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
        .style("filter", d => d.depth === 0 ? "url(#glow)" : "none")
        .transition().duration(800)
        .attr("r", d => getNodeRadius(d.depth));

    nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.children || d._children ? -12 : 12)
        .attr("text-anchor", d => d.children || d._children ? "end" : "start")
        .text(d => d.data.name)
        .style("fill", "#fff")
        .style("font-size", width < 500 ? "10px" : "14px")
        .style("opacity", 0)
        .transition().duration(800)
        .style("opacity", 1);

    // Glow filter
    if (svg.select("defs").empty()) {
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    }

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
        .transition().duration(800)
        .attr("d", d => diagonal(d.source, d.target));

    const t = d3.transition().duration(800);

    node.merge(nodeEnter).transition(t)
        .attr("transform", d => `translate(${d.x},${d.y})`);

    link.merge(link.enter()).transition(t)
        .attr("d", d => diagonal(d.source, d.target));

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

    // Pulsing glow for root
    svg.selectAll("circle").filter(d => d && d.depth === 0)
        .transition().duration(1000)
        .attrTween("r", function(d) {
            const r = getNodeRadius(d.depth);
            return t => r + 3 * Math.sin(t * Math.PI * 2);
        })
        .on("end", () => {
            svg.selectAll("circle").filter(d => d && d.depth === 0)
                .call(d => d.transition().duration(1000).attrTween("r", function(d) {
                    const r = getNodeRadius(d.depth);
                    return t => r + 3 * Math.sin(t * Math.PI * 2);
                }).on("end", arguments.callee));
        });
}

// Diagonal for vertical tree
function diagonal(s, d) {
    return `M ${s.x} ${s.y} C ${s.x} ${(s.y + d.y)/2}, ${d.x} ${(s.y + d.y)/2}, ${d.x} ${d.y}`;
}

// Click to expand/collapse
function click(event, d) {
    if(d.children) { d._children = d.children; d.children = null; }
    else { d.children = d._children; d._children = null; }
    update(d);
}

// Responsive resize
window.addEventListener("resize", () => {
    width = container.clientWidth;
    height = container.clientHeight;
    treeLayout.size([getHorizontalSpacing(), getVerticalSpacing()]);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    update(root);
});

// Adaptive horizontal spacing
function getHorizontalSpacing() {
    const base = width < 400 ? 120 : width < 700 ? 200 : 300;
    return base;
}

// Adaptive vertical spacing
function getVerticalSpacing() {
    const levels = root.height + 1;
    return (height - 150) / levels * levels;
}
