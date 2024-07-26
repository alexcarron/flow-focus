import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormatter',
  standalone: true
})
export class TimeFormatterPipe implements PipeTransform {

  transform(milliseconds: number, ...args: unknown[]): string {
		const isNegative = milliseconds < 0;
		let formattedTime: string = "";

		milliseconds = Math.abs(milliseconds);

		const years = Math.floor(milliseconds / 1000 / 60 / 60 / 24 / 365);
		const weeks = Math.floor(milliseconds / 1000 / 60 / 60 / 24 / 7);
		const days = Math.floor(milliseconds / 1000 / 60 / 60 / 24);
		const hours = Math.floor(milliseconds / 1000 / 60 / 60);
		const minutes = Math.floor((milliseconds / 1000 / 60) % 60);
		const seconds = Math.floor((milliseconds / 1000) % 60);
		const millisecondsLeft = Math.floor(milliseconds % 1000);

		if (years > 0) {
			formattedTime = `${years} year` + (years > 1 ? 's' : '');
		}
		else if (weeks > 0) {
			formattedTime = `${weeks} week` + (weeks > 1 ? 's' : '');
		}
		else if (days > 0) {
			formattedTime = `${days} day` + (days > 1 ? 's' : '');
		}
		else if (hours > 0) {
			formattedTime = `${hours} hour` + (hours > 1 ? 's' : '');
		}
		else if (minutes > 0) {
			formattedTime = `${minutes} minute` + (minutes > 1 ? 's' : '');
		}
		else if (seconds > 0) {
			formattedTime = `${seconds} second` + (seconds > 1 ? 's' : '');
		}
		else {
			formattedTime = `${millisecondsLeft} millisecond` + (millisecondsLeft > 1 ? 's' : '');
		}

		if (isNegative) {
			return  `-${formattedTime}`;
		}
		else {
			return formattedTime;
		}
  }
}
