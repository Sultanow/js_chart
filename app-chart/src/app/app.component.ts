import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as d3 from 'd3';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {

  constructor(private http: HttpClient) {
  }

  title = 'app-chart';

  private root = {};
  private dataBatches = new Map();
  private dataBatchGraph = [];
  private treeData1 = {};

  /*
  private treeData = {
    "name": "Eve",
    "value": 15,
    "type": "black",
    "level": "yellow",
    "children": [
      {
        "name": "Cain",
        "value": 10,
        "type": "grey",
        "level": "red"
      },
      {
        "name": "Seth",
        "value": 10,
        "type": "grey",
        "level": "red",
        "children": [
          {
            "name": "Enos",
            "value": 7.5,
            "type": "grey",
            "level": "purple"
          },
          {
            "name": "Noam",
            "value": 7.5,
            "type": "grey",
            "level": "purple"
          }
        ]
      },
      {
        "name": "Abel",
        "value": 10,
        "type": "grey",
        "level": "blue"
      },
      {
        "name": "Awan",
        "value": 10,
        "type": "grey",
        "level": "green",
        "children": [
          {
            "name": "Enoch",
            "value": 7.5,
            "type": "grey",
            "level": "orange"
          }
        ]
      },
      {
        "name": "Azura",
        "value": 10,
        "type": "grey",
        "level": "green"
      }
    ]
  };
  */

  private margin = { top: 20, right: 120, bottom: 20, left: 120 };
  private width = 960 - this.margin.right - this.margin.left;
  private height = 600 - this.margin.top - this.margin.bottom;

  private svg;

  async ngOnInit() {
    this.dataBatches = await this.getNodes();
    this.dataBatchGraph = await this.getEdges();
    console.log("tree is");
    console.log(this.treeData1);
    this.constructTree(this.root, this.treeData1);
  }

  private async getNodes() {
    const respNodes = await this.http.get("/assets/batch.csv", { responseType: 'text' }).toPromise();
    const list = respNodes.split('\n');
    let nodes = new Map();
    list.forEach((e, i) => {
      if (i > 0) {
        var parts = e.split(',');
        var batch = { id: parts[0], name: parts[1], shortName: parts[2] };
        if (batch.name == "Start") {
          this.root = batch;
        }
        if (batch.id != "") {
          nodes.set(batch.id, batch);
        }
      }
    });
    return nodes;
  }

  private async getEdges() {
    const respEdges = await this.http.get("/assets/batchgraph.csv", { responseType: 'text' }).toPromise();
    const list = respEdges.split('\n');
    let edges = [];
    list.forEach((e, i) => {
      if (i > 0) {
        var parts = e.split(',');
        var edge = { predecessor: parts[0], successor: parts[1] };
        edges.push(edge);
      }
    });
    return edges;
  }

  private constructTree(nodeSrc: any, nodeTgt: any) {
    if (typeof nodeSrc !== 'undefined') {
      nodeTgt.name = nodeTgt.shortName;
      nodeTgt.value = 15;
      nodeTgt.type = "black";
      nodeTgt.level = "orange";

      let successors = this.searchSuccessors(nodeSrc.id, this.dataBatchGraph);
      //console.log(nodeSrc.id);
      if (successors.length > 0) {
        nodeTgt.children = [];
        successors.forEach((e, i) => {
          let successor = this.dataBatches.get(e);
          nodeTgt.children.push(successor);
          this.constructTree(successor, nodeTgt.children[i]);          
        });
      }
      this.drawTree(this.treeData1);
    }
  }

  private searchSuccessors(id: String, edges: []) {
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

    const svg = d3.select("svg#graph")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom);

    const g = svg.append("g").attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

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
}