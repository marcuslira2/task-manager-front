import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TaskService } from '../../services/task.service';
import { Task } from '../../interfaces/task.interface';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    CalendarModule,
    DropdownModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-dialog 
      [(visible)]="visible" 
      [header]="task ? 'Edit Task' : 'Create Task'"
      [modal]="true"
      [style]="{ width: '700px', height: 'auto' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="onClose()"
      [styleClass]="'custom-modal'"
    >
      <div class="task-form-container">
        <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
          
          <div class="form-group">
            <label for="title">Title</label>
            <input 
              id="title" 
              type="text" 
              pInputText 
              formControlName="title" 
              [class.ng-invalid]="taskForm.get('title')?.invalid && taskForm.get('title')?.touched"
              [(ngModel)]="title"
            >
            <small class="error-message" *ngIf="taskForm.get('title')?.invalid && taskForm.get('title')?.touched">
              Title is required
            </small>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="description" 
              pInputTextarea 
              formControlName="description"
              [class.ng-invalid]="taskForm.get('description')?.invalid && taskForm.get('description')?.touched"
              [(ngModel)]="description"
            ></textarea>
            <small class="error-message" *ngIf="taskForm.get('description')?.invalid && taskForm.get('description')?.touched">
              Description is required
            </small>
          </div>

          <div class="form-group">
            <label for="status">Status</label>
            <p-dropdown 
              id="status"
              [options]="statusOptions"
              formControlName="status"
              [class.ng-invalid]="taskForm.get('status')?.invalid && taskForm.get('status')?.touched"
              placeholder="Select a status"
              [(ngModel)]="status"
            ></p-dropdown>
            <small class="error-message" *ngIf="taskForm.get('status')?.invalid && taskForm.get('status')?.touched">
              Status is required
            </small>
          </div>

          <div class="form-group">
            <label for="deadLine">Deadline</label>
            <p-calendar 
              id="deadLine"
              formControlName="deadLine"
              [showTime]="true"
              dateFormat="yy-mm-dd"
              [class.ng-invalid]="taskForm.get('deadLine')?.invalid && taskForm.get('deadLine')?.touched"
              [showIcon]="false"
              [yearRange]="'-5:5'"
              [monthNavigator]="true"
              [yearNavigator]="true"
              [(ngModel)]="deadLine"
              appendTo="body"
            ></p-calendar>
            <small class="error-message" *ngIf="taskForm.get('deadLine')?.invalid && taskForm.get('deadLine')?.touched">
              Deadline is required
            </small>
          </div>

          <div class="form-actions">
            <button 
              pButton 
              type="button" 
              label="Cancel" 
              class="p-button-secondary"
              (click)="onClose()"
            ></button>
            <button 
              pButton 
              type="submit" 
              label="Save"
              [loading]="loading"
              [disabled]="taskForm.invalid || loading"
            ></button>
          </div>
        </form>
      </div>
      <p-toast></p-toast>
    </p-dialog>
  `,
  styleUrls: ['./task-modal.component.scss']
})
export class TaskModalComponent implements OnInit {
  @Input() visible: boolean = false;  
  @Output() visibleChange = new EventEmitter<boolean>();  
  @Output() taskChange = new EventEmitter<Task>();  
  @Input() task: Task | null = null;  
  taskForm: FormGroup;
  loading: boolean = false;
  statusOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' }
  ];
  deadLine: Date | null = null;   
  status: string | null = null; 
  title: string | null = null; 
  description: string | null = null; 
  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private messageService: MessageService
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      status: [null, Validators.required],
      deadLine: [null, Validators.required]
    });
  }

  ngOnInit() {
    if (this.task) {
      this.taskForm.patchValue({
        title: this.task.title,
        description: this.task.description,
        status: this.task.status,
        deadLine: new Date(this.task.deadLine)
      });
      this.deadLine = new Date(this.task.deadLine); 
      this.status = this.task.status; 
      this.title = this.task.title; 
      this.description = this.task.description; 
    }
  }

  onSubmit() {
    if (this.taskForm.valid) {
      this.loading = true;
      const taskData = this.taskForm.value;

      if (this.task) {
        this.taskService.updateTask({ ...this.task, ...taskData }).subscribe({
          next: (updatedTask) => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Task updated successfully!' });
            this.loading = false;
            setTimeout(() => {
              this.taskChange.emit(updatedTask);
              this.onClose();
            }, 1000);
            
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
            this.loading = false;
          }
        });
      } else {
        this.taskService.createTask(taskData).subscribe({
          next: (newTask) => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Task created successfully!' });
            this.loading = false;
            setTimeout(() => {
              this.taskChange.emit(newTask);
              this.onClose();
            }, 1000);
            
          },
          error: (err) => {
            console.error('Error creating task:', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err });
            this.loading = false;
          }
        });
      }
    }
  }

  onClose() {
    this.visible = false;  
    this.visibleChange.emit(this.visible);  
    this.task = null;  
  }
} 