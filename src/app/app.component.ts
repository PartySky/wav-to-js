import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'wav-to-js';

  async getFileFromUrl() {
    let url = 'assets/test.mid';
    let response = await fetch(url);

    let ab = await response.arrayBuffer();
  }
}
