import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { Task } from '../../interfaces/task.interface';
import { TaskModalComponent } from '../task-modal/task-modal.component';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { PaginatedResponse } from '../../interfaces/paginated-response.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    ButtonModule, 
    TableModule, 
    TagModule, 
    DialogModule,
    TaskModalComponent,
    InputTextModule,
    DropdownModule,
    FormsModule
  ],
  providers: [
    MessageService
  ],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <h1 class="app-title">Task Manager</h1>
        <div class="user-actions">
          <span class="username">{{ username }}</span>
          <button 
            pButton 
            type="button" 
            label="Logout" 
            class="p-button-secondary"
            (click)="logout()"
          ></button>
        </div>
      </header>
      
      <div class="dashboard-content">
        <p-table 
          #dt
          [value]="tasks" 
          [tableStyle]="{ 'min-width': '50rem' }"
          [paginator]="true" 
          [rows]="rows"
          [showCurrentPageReport]="true"
          [rowsPerPageOptions]="[5, 10, 25, 50]"
          [totalRecords]="totalRecords"
          [loading]="loading"
          [lazy]="true"
          [(first)]="first"
          (onPage)="onPage($event)"
          (onSort)="onSort($event)"
          [sortMode]="'single'"
          [globalFilterFields]="['title']"
          dataKey="id"
          [filterDelay]="0"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
        >
          <ng-template pTemplate="caption">
            <div class="table-header">
              <span class="p-input-icon-left">
                <i class="pi pi-search"></i>
                <input 
                  pInputText 
                  type="text" 
                  (input)="onSearch($event)"
                  placeholder="Search by title..."
                />
              </span>
              <div class="table-actions">
                <p-dropdown
                  [options]="statusOptions"
                  [(ngModel)]="selectedStatus"
                  (onChange)="onStatusChange($event)"
                  placeholder="Filter by status"
                  [showClear]="true"
                ></p-dropdown>
                <button 
                  pButton 
                  type="button" 
                  label="New Task" 
                  (click)="showCreateModal()"
                  class="p-button-primary"
                ></button>
              </div>
            </div>
          </ng-template>
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 15%" pSortableColumn="title">
                Title <p-sortIcon field="title"></p-sortIcon>
              </th>
              <th style="width: 30%" pSortableColumn="description">
                Description <p-sortIcon field="description"></p-sortIcon>
              </th>
              <th style="width: 10%" pSortableColumn="status">
                Status <p-sortIcon field="status"></p-sortIcon>
              </th>
              <th style="width: 15%" pSortableColumn="createDate">
                Created At <p-sortIcon field="createDate"></p-sortIcon>
              </th>
              <th style="width: 15%" pSortableColumn="deadLine">
                End Date <p-sortIcon field="deadLine"></p-sortIcon>
              </th>
              <th style="width: 15%; text-align: center">Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-task>
            <tr>
              <td>{{task.title}}</td>
              <td>{{task.description}}</td>
              <td>
                <p-tag 
                  [value]="task.status" 
                  [severity]="getStatusSeverity(task.status)"
                ></p-tag>
              </td>
              <td>{{task.createDate | date:'short'}}</td>
              <td>{{task.deadLine | date:'short'}}</td>
              <td style="text-align: center">
                <div class="action-buttons">
                  <button 
                    pButton 
                    type="button" 
                    icon="pi pi-pencil" 
                    class="p-button-rounded p-button-text"
                    (click)="editTask(task)"
                  ></button>
                  <button 
                    pButton 
                    type="button" 
                    icon="pi pi-trash" 
                    class="p-button-rounded p-button-text p-button-danger"
                    (click)="deleteTask(task)"
                  ></button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <app-task-modal
        *ngIf="displayModal"
        [(visible)]="displayModal"
        [task]="selectedTask"
        (visibleChange)="onModalClose()"
      ></app-task-modal>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  @ViewChild('dt') table!: Table;
  
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  displayModal: boolean = false;
  selectedTask: Task | null = null;
  username: string | null = null;
  first: number = 0;
  rows: number = 10;
  sortField?: string;
  sortOrder: 'asc' | 'desc' | undefined;
  private ref?: DynamicDialogRef;
  private searchSubject = new Subject<string>();
  searchTerm: string = '';
  originalTasks: Task[] = [];
  selectedStatus: string | null = null;

  statusOptions = [
    { label: 'All', value: null },
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private taskService: TaskService,
    private messageService: MessageService
  ) {
    this.username = this.authService.getUsername();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.first = 0; 
      this.loadTasks();
    });
  }

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.loading = true;  
    const currentPage = this.first / this.rows;  
    this.taskService.getTasks(currentPage, this.rows).subscribe({
      next: (response: PaginatedResponse<Task>) => {
        this.tasks = response.content;  
        this.totalRecords = response.totalElements; 

        this.originalTasks = [...this.tasks];

        this.tasks.sort((a, b) => {
          const dateA = new Date(a.deadLine).getTime(); 
          const dateB = new Date(b.deadLine).getTime();  
          return dateA - dateB;  
        });

        this.loading = false;  
      },
      error: (error) => {
        console.error('Error loading tasks:', error);  
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tasks' });
        this.loading = false;  
      }
    });
  }

  onPage(event: any) {
    this.first = event.first;  
    this.rows = event.rows;  
    this.loadTasks();  
  }

  onSort(event: any) {
    const { field, order } = event;
    this.tasks.sort((a, b) => {
      const valueA = a[field as keyof Task];
      const valueB = b[field as keyof Task];
      let result = 0;

      if (valueA < valueB) {
        result = -1;
      } else if (valueA > valueB) {
        result = 1;
      }
      return order === 1 ? result : -result;
    });
  }

  showCreateModal() {
    this.selectedTask = null;  
    this.displayModal = true; 
  }

  showEditModal(task: Task) {
    this.selectedTask = { ...task };
    this.displayModal = true;
  }

  onModalClose() {
    this.displayModal = false;
    this.selectedTask = null;
    this.loadTasks();
  }

  onTaskSaved(task: Task) {
    this.loading = true;

    const handleSuccess = () => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: task.id ? 'Task updated successfully' : 'Task created successfully'
      });
      this.loadTasks();
      this.loading = false;
      this.displayModal = false;
      this.selectedTask = null;
    };

    const handleError = (error: any) => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || `Failed to ${task.id ? 'update' : 'create'} task` 
      });
      this.loading = false;
    };

    if (task.id) {
      this.taskService.updateTask(task).subscribe({
        next: handleSuccess,
        error: handleError
      });
    } else {
      this.taskService.createTask(task).subscribe({
        next: handleSuccess,
        error: handleError
      });
    }
  }

  getStatusSeverity(status: string): string {
    const severityMap: { [key: string]: string } = {
      'PENDING': 'warning',
      'IN_PROGRESS': 'info',
      'COMPLETED': 'success'
    };
    return severityMap[status] || 'info';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  editTask(task: Task) {
    this.selectedTask = task;  
    this.displayModal = true; 
  }

  deleteTask(task: Task) {
    this.taskService.deleteTask(task).subscribe({
      next: () => {
        this.loadTasks();
      }
    });
  }

  ngOnDestroy() {
    this.searchSubject.complete();
    if (this.ref) {
      this.ref.close();
    }
  }

  onSearch(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.applyFilters(searchTerm, this.selectedStatus);
  }

  onStatusChange(event: any) {
    this.selectedStatus = event.value;
    if(this.selectedStatus !== null){
      this.loading = true;  
      const currentPage = this.first / this.rows;  
      this.taskService.getTasksByStatus(this.selectedStatus, currentPage, currentPage).subscribe({
        next: (response) => {
          this.tasks = response.content;
          this.totalRecords = response.totalElements;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading tasks by status:', error);
          this.loadTasks();
        }
      });
    }else{
      this.loadTasks();
    }
    
  }

  applyFilters(searchTerm: string, status: string | null) {
    if (!searchTerm && !status) {
      this.tasks = [...this.originalTasks];
    } else {
      this.tasks = this.originalTasks.filter(task => {
        const matchesTitle = task.title.toLowerCase().includes(searchTerm);
        const matchesStatus = !status || task.status === status;
        return matchesTitle && matchesStatus;
      });
    }
    this.totalRecords = this.tasks.length;
  }
} 