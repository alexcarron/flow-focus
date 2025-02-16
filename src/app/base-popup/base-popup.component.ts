import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { TaskTimingOptionsInputComponent } from '../input-controls/task-timing-options-input/task-timing-options-input.component';

@Component({
  selector: 'base-popup',
  standalone: true,
  imports: [CommonModule, TaskTimingOptionsInputComponent],
  templateUrl: './base-popup.component.html',
  styleUrl: './base-popup.component.css'
})
export class BasePopupComponent<ConfirmationEmitType> {
  @Output() onOpenPopup = new EventEmitter<void>();
  @Output() onClosePopup = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<ConfirmationEmitType>();
  @Input() isOpen: boolean = false;
	@Input() emittedConfirmation: ConfirmationEmitType | null = null;
	isConfirmButtonVisible: boolean = true;
	@Input() hostElement: HTMLElement;

	constructor(hostElementReference: ElementRef) {
		this.hostElement = hostElementReference.nativeElement;
	}

	ngOnInit() {
		if (this.isOpen) {
			this.open();
		}
		else {
			this.close();
		}
	}

  open(): void {
    this.onOpenPopup.emit();
    this.isOpen = true;
    this.hostElement.style.display = 'block';
  }

  close(): void {
    this.onClosePopup.emit();
    this.isOpen = false;
    this.hostElement.style.display = 'none';
  }

	confirm(): void {
		if (this.emittedConfirmation !== null) {
			this.onConfirm.emit(this.emittedConfirmation);
		}

		this.close();
	}


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen) {
      const elementClicked = event.target as HTMLElement;
      if (elementClicked?.classList.contains('overlay')) {
        this.close();
      }
    }
  }
}
