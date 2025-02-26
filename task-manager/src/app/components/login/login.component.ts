import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-login',
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
    <div class="login-container">
      <div class="login-box">
        <h1 class="app-title">Task Manager</h1>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-field">
            <input 
              pInputText x
              formControlName="username" 
              placeholder="Username"
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
              label="Login"
              [disabled]="loginForm.invalid"
            ></button>
            
            <button 
              pButton 
              type="button" 
              label="Register" 
              class="p-button-secondary"
              (click)="navigateToRegister()"
            ></button>
          </div>
        </form>
      </div>
    </div>
    <p-toast></p-toast>
  `,
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const credentials = this.loginForm.value;
      
      this.authService.login(credentials).subscribe({
        next: (token) => {
          if (token) {
            const user = this.authService.getUser();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Login successful!'
            });
            setTimeout(() => this.router.navigate(['/dashboard']), 1000);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Invalid token received'
            });
          }
        },
        error: (error) => {
          console.error('Erro no login:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error || 'Login failed. Please check your credentials.'
          });
        }
      });
    }
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }
} 