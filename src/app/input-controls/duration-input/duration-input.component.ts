import { Component } from '@angular/core';
import { NumberInputComponent } from '../number-input/number-input.component';

@Component({
  selector: 'duration-input',
  standalone: true,
  imports: [NumberInputComponent],
  templateUrl: './duration-input.component.html',
  styleUrl: './duration-input.component.css'
})
export class DurationInputComponent {

}
