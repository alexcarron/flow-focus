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
	private static readonly DEFAULT_DURATION = 1000 * 60 * 60;

	getDefaultDuration(): number {
		return SkipTaskPopupComponent.DEFAULT_DURATION;
	}

	override ngOnInit(): void {
		super.ngOnInit();
		this.emittedConfirmation = Duration.fromMilliseconds(SkipTaskPopupComponent.DEFAULT_DURATION);
	}

  onInputChange(durationMilliseconds: number | null): void {
		if (durationMilliseconds === null) return;
		const duration = Duration.fromMilliseconds(durationMilliseconds);
		this.emittedConfirmation = duration;
	}
}
