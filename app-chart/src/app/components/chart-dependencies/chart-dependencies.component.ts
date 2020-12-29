import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { LoadChartDataService } from '../../services/load-chart-data/load-chart-data.service';
import { SearchComponent } from '../search/search.component';
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

export class ChartDependenciesComponent implements OnInit, OnChanges {

  constructor(private loadChartDataService: LoadChartDataService) {}
  
  public static readonly LABEL_DICT: Map<string, string> = new Map([
      ["Parallelisierung", "Parall."],
      ["Synchronisierung(.+)?", "Sync."],
      ["Verzweigung(.+)?", "Verzw."],
      ["Verbindung", "Verb."],
      ["Aktivitätsende", "Ende"]
    ]);

  @Input() searchTerm: string;

  private graphData: any;

  private margin = { top: 20, right: 120, bottom: 20, left: 120 };
  private width = 960 - this.margin.right - this.margin.left;
  private height = 600 - this.margin.top - this.margin.bottom;
  private svg_d3;

  async ngOnInit() {
    this.svg_d3 = d3.select("svg#d3-chart-dependencies")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);
    
    this.loadChartDataService.chartMessage.subscribe(graphData => {
      if (graphData != null) {
        this.graphData = graphData;
        this.drawGraph(graphData);
      }});
  }

  ngOnChanges() {
    this.clear();
    if (this.searchTerm == SearchComponent.SEARCH_RESET) {
      this.drawGraph(this.graphData);
    } else if (this.searchTerm != null && this.searchTerm.length > 2) {
      let treeData = {};
      let root = this.searchNode(this.searchTerm);
      this.constructTree(root, treeData);
      console.log(treeData);
      this.drawTree(treeData);
    } else {
      if (this.svg_d3 != null) {
        this.drawGraph(this.graphData);
      }
    }
  }

  private drawGraph(data: any) {
    var simulation = d3.forceSimulation<any, any>();
    simulation.force("link", d3.forceLink().id(function (d,i) { return d['id']; }).distance(100).strength(1))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(this.width / 2, this.height / 2));

    // build the arrow.
    this.svg_d3.append("svg:defs").selectAll("marker")
      .data(["end"])
      .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

    var link = this.svg_d3.append("g").selectAll(".link")
      .attr("class", "link")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", "black")
      .style("stroke-width", 2)
      .attr("marker-end", "url(#end)");

    var node = this.svg_d3.selectAll(".node")
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

  private clear() {
    if (this.svg_d3 != null) {
      this.svg_d3.selectAll("*").remove();
    }
  }
  
  /*
   * Tree
   */
  private getNode(id: string) {
    for (let node of this.graphData.nodes) {
      if (node.id == id) {
        return node;
      }
    }
    return null;
  }

  private searchNode(shortName: string) {
    for (let node of this.graphData.nodes) {
      if (node.label == shortName) {
        return node;
      }
    }
    return null;
  }

  private searchSuccessors(id: string) {
    let result = [];
    this.graphData.links.forEach(e => {
      if (e.source.id == id) {
        result.push(e.target);
      }
    });
    return result;
  }

  private abbrev(label: string) {
    for (let [key, value] of ChartDependenciesComponent.LABEL_DICT) {
      let regexp = new RegExp(key);
      if (regexp.test(label)) {
        return value;
      }
    }
    return label;
  }

  private constructTree(nodeSrc: any, nodeTgt: any) {
    if (typeof nodeSrc !== 'undefined') {
      nodeTgt.label = nodeSrc.label;

      let successors = this.searchSuccessors(nodeSrc.id);
      if (successors.length > 0) {
        nodeTgt.children = [];
        successors.forEach((e, i) => {
          let successor = this.getNode(e.id);
          nodeTgt.children.push(successor);
          this.constructTree(successor, nodeTgt.children[i]);
        });
      }
    }
  }

  private drawTree(treeData: any) {
    const treemap = d3.tree().size([this.height, this.width]);
    let nodes = d3.hierarchy(treeData, d => d.children);
    nodes = treemap(nodes);

    // build the arrow.
    this.svg_d3.append("svg:defs").selectAll("marker")
      .data(["end"])
      .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

    const g = this.svg_d3.append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    const link = g.selectAll(".link").data(nodes.descendants().slice(1)).enter().append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .style("stroke", d => "black")
      .style("stroke-width", 2)
      .attr("d", function (d: any) {
        return "M" + (d.y-0) + "," + d.x
          + "C" + (d.y + d.parent.y) / 2 + "," + (d.x)
          + " " + (d.y + d.parent.y) / 2 + "," + (d.parent.x)
          + " " + (d.parent.y) + "," + (d.parent.x);
      })
      .attr("marker-start", "url(#end)");

    const node = g.selectAll(".node").data(nodes.descendants()).enter().append("g")
      .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", function (d: any) { return "translate(" + d.y + "," + d.x + ")"; });

    node.append("rect")
      .attr("width", 40)
      .attr("height", 20)
      .attr("transform", function (d) { return "translate(-20,-10)" })
      .style("fill", "lightgray");

    node.append("text")
      .attr("x", -20)
      .attr("dy", ".2em")
      .text(d => this.abbrev(d.data.label));
  }
}