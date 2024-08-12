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
    this.noWrapWidth = this.getTextWidthWithoutWrapping();

    this.adjustWidth();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.adjustWidth();
  }

	/**
	 * Grows the width of the element until the height changes
	 * @param element - The element to grow
	 * @returns True if the height changed
	 */
	private growWidthUntilHeightChange(element: HTMLElement): boolean {
		const computedStyle = getComputedStyle(element);
		const maxWidth = parseFloat(computedStyle.maxWidth);
		const heightBeforeGrowth = element.offsetHeight;
		const widthBeforeGrowth = element.offsetWidth;
		let currentWidth = widthBeforeGrowth;
		let currentHeight = heightBeforeGrowth;

		let didHeightChange = false;

		while (currentWidth < maxWidth && !didHeightChange) {
			currentWidth++;
			element.style.width = `${currentWidth}px`;
			currentHeight = element.offsetHeight;

			if (currentHeight !== heightBeforeGrowth) {
				didHeightChange = true;
			}
		}

		return didHeightChange;
	}

	private adjustWidth(): void {
    const widthBeforeChange = this.hostElement.offsetWidth;
    let heightBeforeChange = this.hostElement.offsetHeight;

		let didWidthGrowthChangeHeight = true;
		let widthToKeep = widthBeforeChange;

		while (didWidthGrowthChangeHeight) {
			didWidthGrowthChangeHeight = this.growWidthUntilHeightChange(this.hostElement);

			if (didWidthGrowthChangeHeight) {
				widthToKeep = this.hostElement.offsetWidth;
			}
		}

		this.hostElement.style.width = `${widthToKeep}px`;

		heightBeforeChange = this.hostElement.offsetHeight;
		let width = widthToKeep;
    while (width > 0) {
      this.hostElement.style.width = `${width}px`;

      if (this.hostElement.offsetHeight !== heightBeforeChange) break;

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
