import { Component, Input, OnInit } from '@angular/core';
import { LoadChartDataService } from '../../services/load-chart-data/load-chart-data.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {

  @Input() searchTerm : string;

  constructor(private loadChartDataService: LoadChartDataService) { }

  ngOnInit() {
    this.loadChartDataService.currentMessage.subscribe(message => {
      console.log(message);});
  }

  search() {
    if (this.searchTerm != null && this.searchTerm.length > 2) {
      alert(this.searchTerm);
    }
  }
}
