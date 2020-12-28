import { Component, OnInit } from '@angular/core';
import { LoadChartDataService } from '../../services/load-chart-data/load-chart-data.service';
import * as d3 from 'd3';

/* 
 * Helpful links:
 * https://ialab.it.monash.edu/webcola/examples/unix.html
 * https://twitter.com/johndavidfive/status/814720460566843392
 * http://bl.ocks.org/fancellu/2c782394602a93921faff74e594d1bb1
 * https://observablehq.com/@xianwu/force-directed-graph-network-graph-with-arrowheads-and-lab
 * http://bl.ocks.org/mbostock/2706022
 */
@Component({
  selector: 'app-chart-dependencies',
  templateUrl: './chart-dependencies.component.html',
  styleUrls: ['./chart-dependencies.component.css']
})

export class ChartDependenciesComponent implements OnInit {

  constructor(private loadChartDataService: LoadChartDataService) {}

  title = 'app-chart';

  private margin = { top: 20, right: 120, bottom: 20, left: 120 };
  private width = 960 - this.margin.right - this.margin.left;
  private height = 600 - this.margin.top - this.margin.bottom;
  private svg;

  async ngOnInit() {
    this.svg = d3.select("svg#d3-chart-dependencies")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);
    //let graphData = await this.loadChartDataService.getGraphData();
    this.loadChartDataService.currentMessage.subscribe(message => {
      if (message != null) {
        this.drawGraph(message);
      }});
  }
  
  private drawGraph(data: any) {
    var simulation = d3.forceSimulation<any, any>();
    simulation.force("link", d3.forceLink().id(function (d,i) { return d['id']; }).distance(100).strength(1))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(this.width / 2, this.height / 2));

    // build the arrow.
    this.svg.append("svg:defs").selectAll("marker")
      .data(["end"])
      .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -1.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

    var link = this.svg.append("g").selectAll(".link")
      .attr("class", "link")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", "black")
      .style("stroke-width", 2)
      .attr("marker-end", "url(#end)");

    var node = this.svg.selectAll(".node")
      .data(data.nodes)
      .enter()
      .append("g")
      .call(d3.drag()
        .on("start", function (event, d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d['fx'] = d['x'];
          d['fy'] = d['y'];
        })
        .on("drag", function (event, d) {
          d['fx'] = event.x;
          d['fy'] = event.y;
        }));

    node.append("rect")
      .attr("width", 40)
      .attr("height", 20)
      .attr("transform", function (d) { return "translate(-20,-10)" })
      .style("fill", "lightgray");

    node.append("text")
      .attr("x", -20)
      .attr("dy", ".2em")
      .text(function (d) { return d.label });

    var ticked = function () {
      link
        .attr("x1", function (d) { return d.source.x; })
        .attr("y1", function (d) { return d.source.y; })
        .attr("x2", function (d) { return d.target.x; })
        .attr("y2", function (d) { return d.target.y; });

      node
        .attr("transform", function (d) { return "translate(" + d.x + ", " + d.y + ")"; });
    }
    simulation.nodes(data.nodes).on("tick", ticked);
    simulation.nodes(data.nodes);
    simulation.force<d3.ForceLink<any, any>>("link").links(data.links);
  }

  /*
   * Tree
   */
  /*
  private searchSuccessors(id: String, edges: any[]) {
    let result = [];
    edges.forEach(e => {
      if (e.predecessor == id) {
        result.push(e.successor);
      }
    });
    return result;
  }

  private drawTree(data: any) {
    const treemap = d3.tree().size([this.height, this.width]);
    console.log(data);
    let nodes = d3.hierarchy(data, d => d.children);
    nodes = treemap(nodes);
    const g = this.svg.append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    const link = g.selectAll(".link").data(nodes.descendants().slice(1)).enter().append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .style("stroke", d => d.data.level)
      .attr("d", function (d: any) {
        return "M" + d.y + "," + d.x
          + "C" + (d.y + d.parent.y) / 2 + "," + d.x
          + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
          + " " + d.parent.y + "," + d.parent.x;
      });

    const node = g.selectAll(".node").data(nodes.descendants()).enter().append("g")
      .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", function (d: any) { return "translate(" + d.y + "," + d.x + ")"; });

    node.append("circle")
      .attr("r", d => d.data.value)
      .style("stroke", d => d.data.type)
      .style("fill", d => d.data.level);

    node.append("text")
      .attr("dy", ".35em")
      .attr("x", d => d.children ? (d.data.value + 5) * -1 : d.data.value + 5)
      .attr("y", function (d: any) { return d.children && d.depth !== 0 ? -(d.data.value + 5) : d.data.value; })
      .style("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name);
  }
  */
}