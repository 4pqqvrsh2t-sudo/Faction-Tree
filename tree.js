const data = {
  name: "Federation",
  children: [
    { name: "Faction A", children: [{ name: "Faction A1" }, { name: "Faction A2" }] },
    { name: "Faction B", children: [{ name: "Faction B1" }, { name: "Faction B2" }] }
  ]
};

// Tree dimensions
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#tree-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", "translate(50,50)");

const root = d3.hierarchy(data);
const treeLayout = d3.tree().size([width - 100, height - 100]);
treeLayout(root);

// Draw links
svg.selectAll('line')
  .data(root.links())
  .enter()
  .append('line')
  .attr('x1', d => d.source.x)
  .attr('y1', d => d.source.y)
  .attr('x2', d => d.target.x)
  .attr('y2', d => d.target.y)
  .attr('stroke', 'white');

// Draw nodes
svg.selectAll('circle')
  .data(root.descendants())
  .enter()
  .append('circle')
  .attr('cx', d => d.x)
  .attr('cy', d => d.y)
  .attr('r', 20)
  .attr('fill', 'orange')
  .on('click', d => alert(`You clicked ${d.data.name}`));

// Add labels
svg.selectAll('text')
  .data(root.descendants())
  .enter()
  .append('text')
  .attr('x', d => d.x)
  .attr('y', d => d.y - 25)
  .attr('text-anchor', 'middle')
  .attr('fill', 'white')
  .text(d => d.data.name);
