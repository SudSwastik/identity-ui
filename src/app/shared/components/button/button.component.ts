import { Component, Input } from '@angular/core';

@Component({
  selector: 'button[appButton]',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'ghost' = 'primary';
  @Input() loading: boolean = false;
}
