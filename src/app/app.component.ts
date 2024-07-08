import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FocusPageComponent } from './focus-page/focus-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FocusPageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
}