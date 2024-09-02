import { Component } from '@angular/core';
import Duration from '../../../model/time-management/Duration';
import { BasePopupComponent } from '../base-popup.component';
import { DurationInputComponent } from '../../input-controls/duration-input/duration-input.component';

@Component({
  selector: 'skip-task-popup',
  standalone: true,
  imports: [BasePopupComponent, DurationInputComponent],
  templateUrl: './skip-task-popup.component.html',
  styleUrl: './skip-task-popup.component.css'
})
export class SkipTaskPopupComponent extends BasePopupComponent<Duration> {

}
