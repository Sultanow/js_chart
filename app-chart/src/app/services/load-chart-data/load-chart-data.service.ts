import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadChartDataService {

  constructor(private http: HttpClient) {}

  private messageSource = new BehaviorSubject<any>(null);
  currentMessage = this.messageSource.asObservable();

  nextMessage(message: any) {
    this.messageSource.next(message)
  }
  
  //private treeData = {};
  private _graphData = {
    inited: false,
    nodes: [],
    links: []
  };

  public async getGraphData() {
    if (!this._graphData.inited) {
      console.log("fetching data");
      let dataBatches = await this.getNodes();
      let dataBatchGraph = await this.getEdges();
      this.constructGraph(dataBatches, dataBatchGraph);
    }
    return this._graphData;
  }

  private async getNodes() {
    const respNodes = await this.http.get("/assets/batch.csv", { responseType: 'text' }).toPromise();
    const list = respNodes.split('\n');
    let nodes = new Map();
    list.forEach((e, i) => {
      if (i > 0) {
        var parts = e.split(',');
        var batch = { id: parts[0], name: parts[1], shortName: parts[2] };
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
        var parts = e.split(','); if (parts.length > 1) {
          var edge = { predecessor: parts[0].trim(), successor: parts[1].trim() };
          edges.push(edge);
        }
      }
    });
    return edges;
  }

  private constructGraph(nodes: Map<String, any>, edges: any[]) {
    nodes.forEach((value: any, key: string) => {
      this._graphData.nodes.push({ id: key, name: key, label: value.shortName });
    });

    edges.forEach((e) => {
      this._graphData.links.push({ source: e.predecessor, target: e.successor, type: 'Next -->>' });
    });

    this._graphData.inited=true;
  }

  /*
  private constructTree(nodeSrc: any, nodeTgt: any) {
    if (typeof nodeSrc !== 'undefined') {
      nodeTgt.name = nodeSrc.shortName;
      nodeTgt.value = 15;
      nodeTgt.type = "black";
      nodeTgt.level = "orange";

      let successors = this.searchSuccessors(nodeSrc.id, this.dataBatchGraph);
      if (successors.length > 0) {
        nodeTgt.children = [];
        successors.forEach((e, i) => {
          let successor = this.dataBatches.get(e);
          nodeTgt.children.push(successor);
          this.constructTree(successor, nodeTgt.children[i]);
        });
      }
    }
  }
  */
}
