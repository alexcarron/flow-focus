import { Pipe, PipeTransform } from '@angular/core';
import DateUtils from '../model/time-management/DateUtils';

@Pipe({
  name: 'dateFormatter',
  standalone: true
})
export class DateFormatterPipe implements PipeTransform {

  transform(date: Date | null, ...args: string[]): string {
		if (date === null) {
			const defaultValue = args[0];
			return defaultValue;
		}
		return DateUtils.formatDate(date);
  }
}
