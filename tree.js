// Collapsible glowing orb faction tree using D3.js
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#tree-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const g = svg.append("g")
    .attr("transform", `translate(${width/2}, ${50})`);

// Example hierarchical data
const data = {
    name: "Federation",
    children: [
        { name: "Faction A", children: [
            { name: "Faction A1" },
            { name: "Faction A2" }
        ] },
        { name: "Faction B" },
        { name: "Faction C", children: [
            { name: "Faction C1" }
        ] }
    ]
};

const root = d3.hierarchy(data);
root.x0 = height / 2;
root.y0 = 0;

// Collapse all children initially
root.children.forEach(collapse);

const treeLayout = d3.tree().size([height - 200, width - 200]);
update(root);

function collapse(d) {
    if(d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

function update(source) {
    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    // Nodes
    const node = g.selectAll(".node")
        .data(nodes, d => d.data.name);

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on("click", click);

    // Glowing orb for Federation
    nodeEnter.append("circle")
        .attr("r", d => d.depth === 0 ? 20 : 10)
        .style("fill", d => d.depth === 0 ? "orange" : "#fff")
        .style("stroke", "#f90")
        .style("stroke-width", d => d.depth === 0 ? 4 : 2)
        .style("filter", d => d.depth === 0 ? "url(#glow)" : "none");

    nodeEnter.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.children || d._children ? -12 : 12)
        .attr("text-anchor", d => d.children || d._children ? "end" : "start")
        .text(d => d.data.name)
        .style("fill", "#fff");

    // Add glow filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id","glow");
    filter.append("feGaussianBlur").attr("stdDeviation","4").attr("result","coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in","coloredBlur");
    feMerge.append("feMergeNode").attr("in","SourceGraphic");

    // Links
    const link = g.selectAll(".link")
        .data(links, d => d.target.data.name);

    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#888")
        .attr("stroke-width", 2)
        .attr("d", d => {
            const o = {x: source.x0, y: source.y0};
            return diagonal(o, o);
        });

    // Transition nodes and links
    const t = d3.transition().duration(500);

    node.merge(nodeEnter).transition(t)
        .attr("transform", d => `translate(${d.y},${d.x})`);

    link.merge(link.enter()).transition(t)
        .attr("d", d => diagonal(d.source, d.target));

    // Store old positions
    nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
}

function diagonal(s, d) {
    return `M ${s.y} ${s.x} C ${(s.y + d.y) / 2} ${s.x}, ${(s.y + d.y) / 2} ${d.x}, ${d.y} ${d.x}`;
}

// Toggle children on click
function click(event, d) {
    if(d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
}
