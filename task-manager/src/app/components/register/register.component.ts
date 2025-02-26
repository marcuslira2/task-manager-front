import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="register-container">
      <div class="register-box">
        <h1 class="app-title">Task Manager</h1>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-field">
            <input 
              pInputText
              formControlName="username" 
              placeholder="Username"
              class="p-inputtext-lg"
            />
          </div>

          <div class="form-field">
            <input 
              pInputText
              formControlName="email" 
              placeholder="Email"
              class="p-inputtext-lg"
            />
          </div>
          
          <div class="form-field">
            <input 
              pInputText 
              type="password" 
              formControlName="password" 
              placeholder="Password"
              class="p-inputtext-lg"
            />
          </div>

          <div class="buttons">
            <button 
              pButton 
              type="submit" 
              label="Register"
              [disabled]="registerForm.invalid"
            ></button>
            
            <button 
              pButton 
              type="button" 
              label="Back to Login" 
              class="p-button-secondary"
              (click)="navigateToLogin()"
            ></button>
          </div>
        </form>
      </div>
    </div>
    <p-toast></p-toast>
  `,
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.authService.register(this.registerForm.value).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Registration successful!'
          });
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error || 'Registration failed. Please try again.'
          });
        }
      });
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
} 