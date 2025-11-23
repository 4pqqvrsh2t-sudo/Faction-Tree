// Responsive vertical tree with collapsed nodes for mobile and Chromebook
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
        .scaleExtent([0.5, 3])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, 50)`); // root near top

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

// COLLAPSE ALL except root
function collapseAll(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapseAll);
        d.children = null;
    }
}
collapseAll(root);

// Tree layout
let treeLayout = d3.tree().size([getHorizontalSpacing(), getVerticalSpacing()]);

update(root);

// Click to expand/collapse
function click(event, d) {
    if(d.children) { d._children = d.children; d.children = null; }
    else { d.children = d._children; d._children = null; }
    update(d);
}

// Update function
function update(source) {
    treeLayout.size([getHorizontalSpacing(), getVerticalSpacing()]);
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
        .transition().duration(800)
        .attr("r", d => d.depth === 0 ? 20 : 10);

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

    // Transition nodes and links
    const t = d3.transition().duration(800);
    node.merge(nodeEnter).transition(t).attr("transform", d => `translate(${d.x},${d.y})`);
    link.merge(link.enter()).transition(t).attr("d", d => diagonal(d.source, d.target));

    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

    // Pulsing root
    svg.selectAll("circle").filter(d => d && d.depth === 0)
        .transition().duration(1000)
        .attrTween("r", function(d) {
            const r = 20;
            return t => r + 3 * Math.sin(t * Math.PI * 2);
        })
        .on("end", function() {
            d3.select(this).call(d => d.transition().duration(1000).attrTween("r", function(d) {
                const r = 20;
                return t => r + 3 * Math.sin(t * Math.PI * 2);
            }).on("end", arguments.callee));
        });
}

// Diagonal function for links
function diagonal(s, d) {
    return `M ${s.x} ${s.y} C ${s.x} ${(s.y + d.y)/2}, ${d.x} ${(s.y + d.y)/2}, ${d.x} ${d.y}`;
}

// Responsive resize
window.addEventListener("resize", () => {
    width = container.clientWidth;
    height = container.clientHeight;
    update(root);
});

// Adaptive horizontal spacing
function getHorizontalSpacing() {
    if (width < 400) return 80;  // small phones
    if (width < 700) return 150; // tablets / narrow screens
    return 250;                  // desktops / Chromebook
}

// Adaptive vertical spacing
function getVerticalSpacing() {
    const levels = root.height + 1;
    return (height - 150) / levels * levels;
}
