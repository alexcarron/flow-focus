import { Component } from '@angular/core';
import Duration from '../../../model/time-management/Duration';
import { BasePopupComponent } from '../base-popup.component';

@Component({
  selector: 'app-skip-task-popup',
  standalone: true,
  imports: [BasePopupComponent],
  templateUrl: './skip-task-popup.component.html',
  styleUrl: './skip-task-popup.component.css'
})
export class SkipTaskPopupComponent extends BasePopupComponent<Duration> {

}
