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

  public static readonly NODE_PARALLELISIERUNG = "fc1db4a1-dbbc-db62-a574-eb92da4a606b";
  
  @Input() searchTerm: string;

  private graphData: any;
  private graphDataNodeps: any;

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
        this.graphDataNodeps = ChartDependenciesComponent.getGraphDataNodeps(graphData);
        console.log(this.graphData);
      }});
  }

  ngOnChanges() {
    this.clear();
    if (this.searchTerm === SearchComponent.SEARCH_RESET) {
      this.drawGraph(this.graphData);
    } else if (this.searchTerm === SearchComponent.SEARCH_FILTER_NODEPS) {
      this.drawGraph(this.graphDataNodeps);
    } else if (this.searchTerm != null && this.searchTerm.length > 2) {
      let treeData = {};
      let root = this.searchNode(this.searchTerm);
      this.constructTree(root, treeData);
      this.drawTree(treeData);
    } else {
      if (this.svg_d3 != null) {
        this.drawGraph(this.graphData);
      }
    }
  }

  private clear() {
    if (this.svg_d3 != null) {
      this.svg_d3.selectAll("*").remove();
    }
  }

  private showBatch(id: string) {
    alert(ChartDependenciesComponent.getNode(id, this.graphData)['name']);
  }

  private drawGraph(graphData: any) {
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
      .data(graphData.links)
      .enter()
      .append("line")
      .attr("stroke", "black")
      .style("stroke-width", 2)
      .attr("marker-end", "url(#end)");

    var node = this.svg_d3.selectAll(".node")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .on("click", (event, d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) => {
        this.showBatch(d['id']);
      })
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
    simulation.nodes(graphData.nodes).on("tick", ticked);
    simulation.nodes(graphData.nodes);
    simulation.force<d3.ForceLink<any, any>>("link").links(graphData.links);
  }
  
  /*
   * Bubble Chart
   */
  public static getBatchesNodeps(graphData: any) : Array<string> {
    let result: Array<string> = [];
    for (let node of graphData.nodes) {
      for (let link of graphData.links) {
        if ((link.source.id === node.id && link.target.id === ChartDependenciesComponent.NODE_PARALLELISIERUNG)
            && (ChartDependenciesComponent.searchPredecessors(node.id, graphData).length == 0)) {
          result.push(node.id);
        }
      }
    }
    return result;
  }

  private static getGraphDataNodeps(graphData: any) : any {
    let batchesNodeps = ChartDependenciesComponent.getBatchesNodeps(graphData);
    let graphDataNodeps = {
      inited: true,
      nodes: [],
      links: []
    };
    for (let node of graphData.nodes) {
      if (!batchesNodeps.includes(node.id)) {
        graphDataNodeps.nodes.push(node);
      }
    }
    for (let link of graphData.links) {
      if (!batchesNodeps.includes(link.source.id) && !batchesNodeps.includes(link.target.id)) {
        graphDataNodeps.links.push(link);
      }
    }
    return graphDataNodeps;
  }

  /*
   * Tree
   */
  private static getNode(id: string, graphData: any) : d3.SimulationLinkDatum<d3.SimulationNodeDatum> {
    for (let node of graphData.nodes) {
      if (node.id == id) {
        return node;
      }
    }
    return null;
  }

  private searchNode(shortName: string) : d3.SimulationLinkDatum<d3.SimulationNodeDatum> {
    for (let node of this.graphData.nodes) {
      if (node.label.toLowerCase() === shortName.toLowerCase()) {
        return node;
      }
    }
    return null;
  }

  private static searchPredecessors(id: string, graphData: any) : d3.SimulationLinkDatum<d3.SimulationNodeDatum>[] {
    let result = [];
    graphData.links.forEach(e => {
      //before drawing the structure is e.[source|target]
      if (e.target.id === id) {
        result.push(e.source);
      }
    });
    return result;
  }

  private searchSuccessors(id: string) : d3.SimulationLinkDatum<d3.SimulationNodeDatum>[] {
    let result = [];
    this.graphData.links.forEach(e => {
      //before drawing the structure is e.[source|target].id
      if (e.source.id == id) {
        result.push(e.target);
      }
    });
    return result;
  }

  private abbrev(label: string) : string {
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
      nodeTgt.id = nodeSrc.id;
      let successors = this.searchSuccessors(nodeSrc.id);
      if (successors.length > 0) {
        nodeTgt.children = [];
        successors.forEach((e, i) => {
          let successor = ChartDependenciesComponent.getNode(e['id'], this.graphData);
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
      .attr("transform", function (d: any) { return "translate(" + d.y + "," + d.x + ")"; })
      .on("click", (event, d: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) => {
        this.showBatch(d['data']['id']);
      });

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