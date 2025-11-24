// ----- TREE.JS -----
const container = document.getElementById("tree-container");

let width = container.clientWidth;
let height = container.clientHeight;

// SVG container
const svg = d3.select("#tree-container")
    .append("svg")
    .attr("width","100%")
    .attr("height","100%")
    .call(d3.zoom()
        .scaleExtent([0.6,1.5])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

const g = svg.append("g");

// SAMPLE DATA
const data = {
    name:"Federation",
    children:[
        {name:"Faction A", children:[{name:"Faction A1"},{name:"Faction A2"}]},
        {name:"Faction B"},
        {name:"Faction C", children:[{name:"Faction C1"}]}
    ]
};

const root = d3.hierarchy(data);
root.x0 = width / 2;
root.y0 = 0;

// Collapse all children initially
root.children?.forEach(collapse);
function collapse(d){
    if(d.children){
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

const treeLayout = d3.tree().nodeSize([100, 80]); // vertical spacing reduced for mobile

// Initial render
update(root);
centerTree();

// Click handler: expand/collapse
function click(event,d){
    if(d.children){
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
    centerTree();
}

// Update function
function update(source){
    const treeData = treeLayout(root);
    const nodes = treeData.descendants();
    const links = treeData.links();

    const nodeRadius = width < 500 ? 12 : 15;
    const fontSize = width < 500 ? 10 : 12;

    // NODES
    const node = g.selectAll(".node").data(nodes, d=>d.data.name);
    const nodeEnter = node.enter().append("g")
        .attr("class","node")
        .attr("transform", d=>`translate(${source.x0},${source.y0})`)
        .on("click", click);

    nodeEnter.append("circle")
        .attr("r",0)
        .style("fill", d=>d._children?"#f90":"#fff")
        .style("stroke","#f90")
        .style("stroke-width",2)
        .transition().duration(800) // slower animation
        .attr("r", nodeRadius);

    nodeEnter.append("text")
        .attr("dy",".35em")
        .attr("x", d=>d._children?-20:20)
        .attr("text-anchor", d=>d._children?"end":"start")
        .text(d=>d.data.name)
        .style("fill","#fff")
        .style("font-size", fontSize + "px")
        .style("opacity",0)
        .transition().duration(800)
        .style("opacity",1);

    // LINKS
    const link = g.selectAll(".link").data(links, d=>d.target.data.name);
    link.enter().insert("path","g")
        .attr("class","link")
        .attr("fill","none")
        .attr("stroke","#888")
        .attr("stroke-width",2)
        .attr("d", d=>`M${source.x0},${source.y0} C${source.x0},${source.y0} ${source.x0},${source.y0} ${source.x0},${source.y0}`)
        .transition().duration(800)
        .attr("d", d=>diagonal(d));

    // TRANSITION TO NEW POSITIONS
    const t = d3.transition().duration(800);
    node.merge(nodeEnter).transition(t)
        .attr("transform", d=>`translate(${d.x},${d.y})`);
    link.merge(link.enter()).transition(t)
        .attr("d", d=>diagonal(d));

    nodes.forEach(d=>{ d.x0=d.x; d.y0=d.y; });
}

// Diagonal generator
function diagonal(d){
    return `M${d.source.x},${d.source.y} C${d.source.x},${(d.source.y+d.target.y)/2} ${d.target.x},${(d.source.y+d.target.y)/2} ${d.target.x},${d.target.y}`;
}

// CENTER TREE
function centerTree(){
    const nodes = g.selectAll(".node").nodes();
    if(nodes.length===0) return;

    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    nodes.forEach(n=>{
        const bbox = n.getBBox();
        const x = n.getCTM().e + bbox.x + bbox.width/2;
        const y = n.getCTM().f + bbox.y + bbox.height/2;
        minX = Math.min(minX,x);
        maxX = Math.max(maxX,x);
        minY = Math.min(minY,y);
        maxY = Math.max(maxY,y);
    });

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    const offsetX = (width - treeWidth)/2 - minX;
    const offsetY = (height - treeHeight)/2 - minY;

    g.transition().duration(800)
        .attr("transform",`translate(${offsetX},${offsetY}) scale(1)`);
}

// RESIZE HANDLER
window.addEventListener("resize", ()=>{
    width = container.clientWidth;
    height = container.clientHeight;
    update(root);
    centerTree();
});
