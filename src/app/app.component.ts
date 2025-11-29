import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'genkit-angular-demo';
  constructor(private http: HttpClient) {}

  emailTooltip = '';
  emailExample = '';
  phoneTooltip = '';
  phoneExample = '';
  
  emailValue = '';
  phoneValue = '';
  
  loading = false;
  emailSubmitted = false;
  phoneSubmitted = false;

  async onSubmit(event: Event) {
    event.preventDefault();

    this.loading = true;
    this.emailSubmitted = false;
    this.phoneSubmitted = false;

    // Always validate both fields, even if empty
    const requests: Promise<any>[] = [
      // Email validation - always sent
      firstValueFrom(
        this.http.post('/api/validation', {
          fieldName: 'Email',
          userInput: this.emailValue.trim() || undefined
        })
      ).then((res: any) => {
        this.emailTooltip = res.tooltip || '';
        this.emailExample = res.example || '';
        this.emailSubmitted = true;
      }).catch((error) => {
        console.error('Error fetching email validation:', error);
        this.emailTooltip = 'Error: Could not fetch validation. Please try again.';
        this.emailExample = '';
        this.emailSubmitted = true;
      }),

      // Phone validation - always sent
      firstValueFrom(
        this.http.post('/api/validation', {
          fieldName: 'Phone Number (Kenyan)',
          userInput: this.phoneValue.trim() || undefined
        })
      ).then((res: any) => {
        this.phoneTooltip = res.tooltip || '';
        this.phoneExample = res.example || '';
        this.phoneSubmitted = true;
      }).catch((error) => {
        console.error('Error fetching phone validation:', error);
        this.phoneTooltip = 'Error: Could not fetch validation. Please try again.';
        this.phoneExample = '';
        this.phoneSubmitted = true;
      })
    ];

    try {
      await Promise.all(requests);
    } finally {
      this.loading = false;
    }
  }
}
