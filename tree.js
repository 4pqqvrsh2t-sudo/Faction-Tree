// Mobile-friendly, smooth, pulsing glowing orb faction tree

const container = document.getElementById("tree-container");

let width = container.clientWidth;
let height = container.clientHeight;

// Node size function based on screen width
function getNodeRadius(depth) {
    if (width < 500) return depth === 0 ? 15 : 7;
    if (width < 800) return depth === 0 ? 20 : 10;
    return depth === 0 ? 25 : 12;
}

// Create SVG
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

const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, 50)`);

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
root.x0 = height / 2;
root.y0 = 0;

root.children.forEach(collapse);

const treeLayout = d3.tree().size([height - 150, width - 150]);
update(root);

// Collapse helper
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

// Update function
function update(source) {
    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    // NODES
    const node = g.selectAll(".node").data(nodes, d => d.data.name);

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on("click", click);

    // Circles
    const circles = nodeEnter.append("circle")
        .attr("r", 0)
        .style("fill", d => d.depth === 0 ? "orange" : "#fff")
        .style("stroke", "#f90")
        .style("stroke-width", d => d.depth === 0 ? 4 : 2)
        .style("filter", d => d.depth === 0 ? "url(#glow)" : "none")
        .transition().duration(800)
        .attr("r", d => getNodeRadius(d.depth));

    // Text
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

    // LINKS
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
        .attr("transform", d => `translate(${d.y},${d.x})`);

    link.merge(link.enter()).transition(t)
        .attr("d", d => diagonal(d.source, d.target));

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

    // PULSING GLOW for Federation orb
    svg.selectAll("circle").filter(d => d && d.depth === 0)
        .transition().duration(1000)
        .attrTween("r", function(d) {
            const r = getNodeRadius(d.depth);
            return t => r + 3 * Math.sin(t * Math.PI * 2);
        })
        .on("end", () => {
            // repeat pulse
            svg.selectAll("circle").filter(d => d && d.depth === 0)
                .call(d => d.transition().duration(1000).attrTween("r", function(d) {
                    const r = getNodeRadius(d.depth);
                    return t => r + 3 * Math.sin(t * Math.PI * 2);
                }).on("end", arguments.callee));
        });
}

// Diagonal path helper
function diagonal(s, d) {
    return `M ${s.y} ${s.x} C ${(s.y + d.y)/2} ${s.x}, ${(s.y + d.y)/2} ${d.x}, ${d.y} ${d.x}`;
}

// Click handler
function click(event, d) {
    if(d.children) { d._children = d.children; d.children = null; }
    else { d.children = d._children; d._children = null; }
    update(d);
}

// Resize handler
window.addEventListener("resize", () => {
    width = container.clientWidth;
    height = container.clientHeight;
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    treeLayout.size([height - 150, width - 150]);
    update(root);
});
