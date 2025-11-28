window.addEventListener("DOMContentLoaded", () => {

const container = document.getElementById("tree-container");
let width = container.clientWidth;
let height = container.clientHeight;

// SVG setup
const svg = d3.select("#tree-container")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .call(d3.zoom()
    .scaleExtent([0.5, 2])
    .on("zoom", (event) => g.attr("transform", event.transform))
  );

const g = svg.append("g")
  .attr("transform", `translate(${width/2}, 80)`);

// Tree data
const data = {
  name: "The Federation",
  link: "federation.html",
  children: [
    {
      name: "The Polar Domain",
      link: "polar-domain.html",
      children: [
        {
          name: "The Luminara Consortium",
          link: "luminara.html",
          children: [
            { name: "Workers Union", link: "workers.html" },
            { name: "Hidden Faction", link: "hidden.html" }
          ]
        }
      ]
    }
  ]
};

const root = d3.hierarchy(data);
root.x0 = width / 2;
root.y0 = 0;

// Collapse all except root
if (root.children) root.children.forEach(collapse);

function collapse(d) {
  if(d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
}

// Tree layout
const treeLayout = d3.tree().nodeSize([120, 150]);

update(root);

// Click to expand/collapse and open link
function click(event, d) {
  if(d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);

  if(d.data.link) {
    window.open(d.data.link, "_blank");
  }
}

// Main update
function update(source) {
  const treeData = treeLayout(root);
  const nodes = treeData.descendants();
  const links = treeData.links();

  // Nodes
  const node = g.selectAll(".node")
    .data(nodes, d => d.data.name);

  const nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${source.x0},${source.y0})`)
    .on("click", click);

  nodeEnter.append("circle")
    .attr("r", 0)
    .attr("class", d => d.depth === 0 ? "glow" : "")
    .transition().duration(600)
    .attr("r", 20);

  nodeEnter.append("text")
    .attr("dy", ".35em")
    .attr("x", 0)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("opacity", 0)
    .text(d => d.data.name)
    .transition().duration(600)
    .style("opacity", 1);

  node.merge(nodeEnter)
    .transition().duration(600)
    .attr("transform", d => `translate(${d.x},${d.y})`);

  // Links
  const link = g.selectAll(".link")
    .data(links, d => d.target.data.name);

  link.enter().insert("path", "g")
    .attr("class", "link")
    .attr("d", d => {
      const o = { x: source.x0, y: source.y0 };
      return diagonal(o, o);
    })
    .transition().duration(600)
    .attr("d", d => diagonal(d.source, d.target));

  link.merge(link.enter())
    .transition().duration(600)
    .attr("d", d => diagonal(d.source, d.target));

  nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
}

function diagonal(s, d) {
  return `M ${s.x} ${s.y} C ${s.x} ${(s.y + d.y)/2}, ${d.x} ${(s.y + d.y)/2}, ${d.x} ${d.y}`;
}

// Responsive
window.addEventListener("resize", () => {
  width = container.clientWidth;
  height = container.clientHeight;
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  update(root);
});

}); // END DOMContentLoaded
