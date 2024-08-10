import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[shrinkToFit]',
  standalone: true
})
export class ShrinkToFitDirective {
	private hostElement: HTMLElement;
	noWrapWidth: number = 0;

  constructor(hostElementReference: ElementRef) {
		this.hostElement = hostElementReference.nativeElement;
	}

  ngAfterViewInit(): void {
    const computedStyle = getComputedStyle(this.hostElement);
    this.noWrapWidth = this.getTextWidthWithoutWrapping();

    this.adjustWidth();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.adjustWidth();
  }

	private adjustWidth(): void {
		const computedStyle = getComputedStyle(this.hostElement);
		const maxWidth = parseFloat(computedStyle.maxWidth);
    const currentWidth = this.hostElement.offsetWidth;
    const currentHeight = this.hostElement.offsetHeight;

		console.log({currentWidth, maxWidth, currentHeight, noWrapWidth: this.noWrapWidth});

		let width = currentWidth;

    while (width < maxWidth) {
      this.hostElement.style.width = `${width}px`;

      if (this.hostElement.offsetHeight !== currentHeight) break;

      width++;
    }

    while (width > 0) {
      this.hostElement.style.width = `${width}px`;

      if (this.hostElement.offsetHeight !== currentHeight) break;

      width--;
    }

    // Set width based on content
    if (width < this.hostElement.scrollWidth) {
			this.hostElement.style.width = `${this.hostElement.scrollWidth}px`;
    }
		else {
			this.hostElement.style.width = `${width + 1}px`;
    }
	}

  private getTextWidthWithoutWrapping(): number {
    const cloneElement = this.hostElement.cloneNode() as HTMLElement;

    // Clone the element and set styles to prevent wrapping
    cloneElement.style.position = 'absolute';
    cloneElement.style.visibility = 'hidden';
    cloneElement.style.whiteSpace = 'nowrap';
    cloneElement.style.width = 'auto';
    cloneElement.innerHTML = this.hostElement.innerHTML;

    // Add the clone to the document
    document.body.appendChild(cloneElement);

    // Measure the height of the clone
    const width = cloneElement.offsetWidth;

    // Remove the clone from the document
    document.body.removeChild(cloneElement);

    return width;
  }
}
