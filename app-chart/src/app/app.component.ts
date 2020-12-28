import { Component, OnInit} from '@angular/core';
import { LoadChartDataService } from './services/load-chart-data/load-chart-data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {

  constructor(private loadChartDataService: LoadChartDataService) { }

  async ngOnInit() {
    let graphData = await this.loadChartDataService.getGraphData();
    this.loadChartDataService.nextMessage(graphData);
  }
}