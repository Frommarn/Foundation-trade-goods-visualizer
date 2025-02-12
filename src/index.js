// import * as d3 from "https://d3js.org/d3.v7.min.js";
// import * as d3dag from "https://unpkg.com/d3-dag@1.1.0";
// import * as YAML from "https://cdn.skypack.dev/pin/yaml@v2.7.0-lrNf9kGMKLtf64HYtNFb/mode=imports,min/optimized/yaml.js";
import * as YAML from "https://cdn.skypack.dev/yaml";
import * as d3 from "https://cdn.skypack.dev/d3@7.8.4";
import * as d3dag from "https://cdn.skypack.dev/d3-dag@1.0.0-1";

let nodes = [];
let links = [];
let yamlData = null; // Store the original parsed data

const tooltip = d3.select(".tooltip");
// const width = 800;
// const height = 600;

// global
let svg = d3
  .select("#chart")
  .select("#svg");


// Event listener for radio buttons
// d3.selectAll('input[name="visualization"]').on('change', function () {
//     currentVisualization = this.value;
//     console.log(currentVisualization)
//     updateVisualization();
// });

document.getElementById('yamlFileInput').addEventListener('change', handleFileSelect);

let d3dagOrientation = "none";
document.getElementById("d3dagOrientation").addEventListener("change", function () {
  d3dagOrientation = this.value;
  console.log("Selected option:", d3dagOrientation);

  updateVisualization();
});

let isRectangle = true;
document.getElementById("isRectangle").addEventListener("change", function () {
  isRectangle = this.checked; // Update boolean based on checkbox state
  console.log("isRectangle:", isRectangle); // Log the value (for debugging)

  // Call other functions that depend on this boolean value here:
  updateVisualization();
});

let nodeRadius = 30;
document.getElementById("nodeRadius").addEventListener("change", function () {
  const newValue = parseInt(this.value); // Parse the input as a float
  if (newValue >= 20) { // Check if the input is a valid number
    nodeRadius = newValue;
    this.value = newValue;
    // console.log("Global number updated:", nodeRadius);

    updateVisualization();
  } else {
    alert("Invalid input. Please enter a number >= 20.");
    this.value = nodeRadius; // Revert to the previous valid value
  }
});

function handleFileSelect(event) {
  const file = event.target.files[0];
  const reader = new FileReader(); // Use FileReader for YAML

  reader.onload = function (e) {
    try {
      yamlData = YAML.parse(e.target.result); // Parse YAML
      console.log(yamlData); // Log the YAML data
    } catch (error) {
      console.error("Error parsing YAML:", error);
      // Handle the error appropriately, e.g., display a message to the user
      alert("Invalid YAML file. Please check the file format.");
    }
    updateVisualization();
  }

  reader.readAsText(file); // Read the file as text (required for YAML)
}

function updateVisualization() {
  if (!yamlData) {
    return
  }

  // Clear previous visualization
  svg
    .select("#nodes")
    .selectAll("g")
    .remove();
  svg
    .select("#defs")
    .selectAll("linearGradient")
    .remove();
  svg
    .select("#links")
    .selectAll("path")
    .remove();
  svg
    .select("#arrows")
    .selectAll("path")
    .remove();

  drawD3DAG();
}

function drawForceDirected() {

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100)) // Adjust distance as needed
    .force("charge", d3.forceManyBody().strength(-400)) // Adjust strength as needed
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g").attr("class", "links")
    .selectAll("line")
    .data(links, d => d.target.id + "-" + d.source.id);

  const node = svg.append("g").attr("class", "nodes")
    .selectAll("g"); // Group for circle and text

  // Update links
  //   links = link.data(links, d => d.target.id + "-" + d.source.id); //Important for correct update
  //   links.exit().remove();
  //   links = links.enter().append("line")
  //       .attr("class", "link")
  //       .merge(link);

  const linksUpdate = svg.select(".links").selectAll("line")
    .data(links, d => d.target.id + "-" + d.source.id);

  linksUpdate.exit().remove();

  const linksEnter = linksUpdate.enter().append("line")
    .attr("class", "link");

  linksUpdate.merge(linksEnter); // Merge enter and update selections


  // Update nodes
  // node = node.data(nodes, d => d.id); //Important for correct update
  // node.exit().remove();
  // const nodeEnter = node.enter().append("g").attr("class", "node");
  // nodeEnter.append("circle")
  //   .attr("r", 10)
  //   .attr("fill", d => {
  //     switch (d.type) {
  //       case "Base": return "green";
  //       case "Intermediate": return "blue";
  //       case "Product": return "red";
  //       default: return "gray";
  //     }
  //   })
  //   .on("mouseover", showTooltip)
  //   .on("mouseout", hideTooltip);
  // nodeEnter.append("text")
  //   .attr("dy", ".35em")
  //   .text(d => d.id);
  // node = node.merge(nodeEnter);

  const nodesUpdate = svg.select(".nodes").selectAll("g")
    .data(nodes, d => d.id);

  nodesUpdate.exit().remove();

  const nodesEnter = nodesUpdate.enter().append("g").attr("class", "node");

  nodesEnter.append("circle")
    .attr("r", 10)
    .attr("fill", d => {
      switch (d.type) {
        case "Base": return "green";
        case "Intermediate": return "blue";
        case "Product": return "red";
        default: return "gray";
      }
    })
    .on("mouseover", showTooltipNode)
    .on("mouseout", hideTooltip);

  nodesEnter.append("text")
    .attr("dy", ".35em")
    .text(d => d.id);

  nodesUpdate.merge(nodesEnter); // Merge enter and update selections

  // simulation.force("link", d3.forceLink(links).id(d => d.id).distance(100));
  simulation.nodes(nodes);
  simulation.alpha(1).restart(); // Reheat simulation

  // simulation.on("tick", () => {
  //   link
  //     .attr("x1", d => d.source.x)
  //     .attr("y1", d => d.source.y)
  //     .attr("x2", d => d.target.x)
  //     .attr("y2", d => d.target.y);

  //   node.attr("transform", d => `translate(${d.x},${d.y})`);
  // });

  simulation.on("tick", () => {
    svg.selectAll(".node") // Select all node groups in the SVG
      .attr("transform", d => {
        d.x = Math.max(10, Math.min(width - 10, d.x)); // Keep within x bounds
        d.y = Math.max(10, Math.min(height - 10, d.y)); // Keep within y bounds
        // console.log(d.id + "(" + d.x + "," + d.y + ")")
        return `translate(${d.x},${d.y})`;
      });

    svg.selectAll(".link")  // Select all links in the SVG
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    // svg.selectAll(".node") // Select all node groups in the SVG
    //   .attr("transform", d => `translate(${d.x},${d.y})`);
    // Set initial positions (optional, but often helpful)
    // simulation.nodes(nodes).forEach(node => {
    //   node.x = width / 2 + Math.random() * 200 - 100; // Center with some randomness
    //   node.y = height / 2 + Math.random() * 200 - 100; // Center with some randomness
    // });
  });
}

function drawTidyTree() {
  const root = d3.stratify().id(d => d.Good).parentId(d => {
    if (d.Type !== "Base") {
      const parents = [];
      if (d.BaseGood1) parents.push(d.BaseGood1);
      if (d.BaseGood2) parents.push(d.BaseGood2);
      return parents.length > 0 ? parents : null; // Return array of parents or null
    }
    return null;
  })(graphData);

  const treeLayout = d3.tree().size([width, height]);
  const treeData = treeLayout(root);

  const treeNodes = treeData.descendants();
  const treeLinks = treeData.links();

  // Create a map to efficiently find nodes by ID
  const nodeMap = new Map(treeNodes.map(node => [node.data.Good, node]));

  // Draw links (now curved)
  svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .selectAll("path")
    .data(treeLinks)
    .join("path")
    .attr("d", d3.linkHorizontal({
      source: d => d.source.x,
      target: d => d.target.x
    }));

  // Draw explicit links for multiple parents
  svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "red") // Highlight explicit links
    .attr("stroke-opacity", 0.8)
    .selectAll("path")
    .data(graphData.filter(d => d.Type !== "Base" && (d.BaseGood2 || d.BaseGood1))) // Filter for multi-parent goods
    .join("path")
    .attr("d", d => {
      const target = nodeMap.get(d.Good);
      const source1 = d.BaseGood1 ? nodeMap.get(d.BaseGood1) : null;
      const source2 = d.BaseGood2 ? nodeMap.get(d.BaseGood2) : null;

      // Create curved paths for each parent
      let pathStr = "";
      if (source1) {
        pathStr += d3.linkHorizontal({ source: source1, target: target })();
      }
      if (source2) {
        pathStr += d3.linkHorizontal({ source: source2, target: target })();
      }
      return pathStr;
    });


  // Draw nodes
  const node = svg.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll("g")
    .data(treeNodes) // Use treeNodes
    .join("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);

  node.append("circle")
    .attr("r", 5)
    .attr("fill", d => {
      switch (d.data.Type) {
        case "Base": return "green";
        case "Intermediate": return "blue";
        case "Product": return "red";
        default: return "gray";
      }
    })
    .on("mouseover", showTooltipNode)
    .on("mouseout", hideTooltip);

  node.append("text")
    .attr("dy", "0.31em")
    .attr("x", d => d.children ? -8 : 8)
    .attr("text-anchor", d => d.children ? "end" : "start")
    .text(d => d.data.id);
}

/**
 * get transform for arrow rendering
 *
 * This transform takes anything with points (a graph link) and returns a
 * transform that puts an arrow on the last point, aligned based off of the
 * second to last.
 */
function arrowTransform(d) { // Changed to 'd' to represent data
  const points = d.points; // Access points property

  if (!points || points.length < 2) {
    return ""; // Or handle the case where points is undefined or has less than 2 points.
  }

  const [[x1, y1], [x2, y2]] = points.slice(-2);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI + 90;
  return `translate(${x2}, ${y2}) rotate(${angle})`;
}

function drawD3DAG() {
  const builder = d3dag.graphStratify()
    .id(function (d) { return d.name })
    .parentData(function (d) {
      console.log(d)
      if (d.ingredients) {
        return d.ingredients.map(ingredient => ([ingredient.name, { quantity: ingredient.quantity }]));
      } else {
        return [];
      }
    });
  const graph = builder(yamlData.goods)

  // set the layout functions
  const nodeSize = [isRectangle ? nodeRadius * 3 : nodeRadius * 2, nodeRadius * 2];

  const tweakArray = []
  const tweakFlipValue = d3dagOrientation;

  // this truncates the edges so we can render arrows nicely
  const shape = d3dag.tweakShape(tweakFlipValue == "diagonal" ? [nodeSize[1], nodeSize[0]] : nodeSize, isRectangle ? d3dag.shapeRect : d3dag.shapeEllipse);
  tweakArray.push(shape)

  if (tweakFlipValue == "diagonal") {
    const orientation = d3dag.tweakFlip(tweakFlipValue);
    tweakArray.push(orientation)
  }

  // use this to render our edges
  const line = d3.line().curve(d3.curveMonotoneY);

  // here's the layout operator, uncomment some of the settings
  const layout = d3dag
    .sugiyama()
    //.layering(d3dag.layeringLongestPath())
    //.decross(d3dag.decrossOpt())
    //.coord(d3dag.coordGreedy())
    //.coord(d3dag.coordQuad())
    .nodeSize(tweakFlipValue == "diagonal" ? [nodeSize[1], nodeSize[0]] : nodeSize)
    .gap([nodeRadius, nodeRadius])
    // .tweaks([shape]);
    .tweaks(tweakArray);

  const trans = svg.transition().duration(750);

  // actually perform the layout and get the final size
  const { width, height } = layout(graph);

  // set svg size and pad a little for link thickness
  svg
    .style("width", width + 4)
    .style("height", height + 4);

  // --------- //
  // Rendering //
  // --------- //

  // colors
  // const colorMap = new Map([
  //   ["Base", "rgb(255, 0, 0)"],
  //   ["Intermediate", "rgb(0, 255, 0)"],
  //   ["product", "rgb(0, 0, 255)"]]);
  const colorMap = new Map([
    ["Base", "green"],
    ["Intermediate", "orange"],
    ["Product", "red"]]);

  console.log(colorMap);

  // node.append("rect")
  // .attr("width", 60) // Adjust width as needed
  // .attr("height", 40) // Adjust height as needed
  // .attr("rx", 5) // Rounded corners (optional)
  // .attr("ry", 5) // Rounded corners (optional)
  // .attr("fill", "#FAF9F6") // Parchment beige
  // .attr("stroke", "#D0C8B6") // Slightly darker border
  // .attr("stroke-width", 1)
  // .style("filter", dropshadow); // Subtle shadow

  // node.append("circle")
  //   .attr("r", 30) // Adjust radius as needed
  //   .attr("fill", "#FAF9F6") // Parchment beige
  //   .attr("stroke", "#D0C8B6") // Slightly darker border
  //   .attr("stroke-width", 1)
  //   .style("filter", dropshadow); // Subtle shadow

  // node.append("text")
  //   .attr("text-anchor", "middle")
  //   .attr("dominant-baseline", "central") // Vertically center text
  //   .text(d => d.data.name) // Display the name
  //   .attr("font-size", 12)  // Adjust font size
  //   .attr("font-family", "YourChosenFont") // Replace with your font
  //   .attr("fill", "#5C4A2E"); // Dark brown text

  const dropshadow = "drop-shadow(2px 2px 2px rgba(0,0,0,0.2))";
  // nodes
  svg
    .select("#nodes")
    .selectAll("g")
    .data(graph.nodes())
    .join((enter) =>
      enter
        .append("g")
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .attr("opacity", 0)
        .on("mouseover", showTooltipNode)
        .on("mouseout", hideTooltip)
        .call((enter) => {
          if (isRectangle) {
            enter
              .append("rect")
              .attr("width", nodeSize[0])
              .attr("height", nodeSize[1])
              .attr("x", -(nodeSize[0] / 2))
              .attr("y", -(nodeSize[1] / 2))
              .attr("rx", 5)
              .attr("ry", 5)
              .attr("fill", "#f4ddab") // Parchment beige
              .attr("stroke", "#c1ae87") // Slightly darker border
              .attr("stroke-width", 1)
              .style("filter", dropshadow); // Subtle shadow
          } else {
            enter
              .append("circle")
              .attr("r", nodeRadius)
              .attr("fill", "#f4ddab") // Parchment beige
              .attr("stroke", "#c1ae87") // Slightly darker border
              .attr("stroke-width", 1)
              .style("filter", dropshadow); // Subtle shadow
          }
          enter
            .append("text")
            .text((d) => d.data?.displayName ?? d.data.name)
            .attr("font-weight", "bold")
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("font-size", 14)
            .attr("fill", "gray");
          enter.transition(trans).attr("opacity", 1);
        })
    );

  // link gradients
  svg
    .select("#defs")
    .selectAll("linearGradient")
    .data(graph.links())
    .join((enter) =>
      enter
        .append("linearGradient")
        .attr("id", ({ source, target }) =>
          encodeURIComponent(`${source.data.name}--${target.data.name}`)
        )
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", ({ points }) => points[0][0])
        .attr("x2", ({ points }) => points[points.length - 1][0])
        .attr("y1", ({ points }) => points[0][1])
        .attr("y2", ({ points }) => points[points.length - 1][1])
        .style("filter", dropshadow) // Subtle shadow
        .call((enter) => {
          enter
            .append("stop")
            .attr("class", "grad-start")
            .attr("offset", "0%")
            .attr("stop-color", ({ source }) => colorMap.get(source.data.type));
          enter
            .append("stop")
            .attr("class", "grad-stop")
            .attr("offset", "100%")
            .attr("stop-color", ({ target }) => colorMap.get(target.data.type));
        })
    );

  // link paths
  svg
    .select("#links")
    .selectAll("path")
    .data(graph.links())
    .join((enter) =>
      enter
        .append("path")
        .attr("d", ({ points }) => line(points))
        .attr("fill", "none")
        .attr("stroke-width", 3)
        .attr(
          "stroke",
          ({ source, target }) => `url(#${source.data.name}--${target.data.name})`
        )
        .on("mouseover", showTooltipLink)
        .on("mouseout", hideTooltip)
        .attr("opacity", 0)
        .style("filter", dropshadow) // Subtle shadow
        .call((enter) => enter.transition(trans).attr("opacity", 1))
    );

  // Arrows
  const arrowSize = 80;
  const arrowLen = Math.sqrt((4 * arrowSize) / Math.sqrt(3));
  const arrow = d3.symbol().type(d3.symbolTriangle).size(arrowSize);
  svg
    .select("#arrows")
    .selectAll("path")
    .data(graph.links())
    .join((enter) =>
      enter
        .append("path")
        .attr("d", arrow)
        .attr("fill", ({ target }) => colorMap.get(target.data.type))
        .attr("transform", arrowTransform)
        .attr("opacity", 0)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        // use this to put a white boundary on the tip of the arrow
        .attr("stroke-dasharray", `${arrowLen},${arrowLen}`)
        .call((enter) => enter.transition(trans).attr("opacity", 1))
    );
}

function showTooltipNode(event, d) {
  // console.log(d);
  tooltip.transition().duration(200).style("opacity", .9);
  tooltip.html(`<b>${d.data.name}</b><br>Type: ${d.data.type}<br>Buy Price: ${d.data.buyPrice}<br>Sell Price: ${d.data.sellPrice}`)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
}

function showTooltipLink(event, d) {
  console.log(d);
  tooltip.transition().duration(200).style("opacity", .9);
  tooltip.html(`<b>Quantity: ${d.data.quantity}</b>`)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 28) + "px");
}

function hideTooltip() {
  tooltip.transition().duration(500).style("opacity", 0);
}

// function exportCSV() {
//     const csv = Papa.unparse({ fields: Object.keys(graphData[0]), data: graphData });
//     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement("a");
//     const url = URL.createObjectURL(blob);
//     link.setAttribute("href", url);
//     link.setAttribute("download", "trade_goods.csv");
//     link.style.visibility = 'hidden';
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
// }
