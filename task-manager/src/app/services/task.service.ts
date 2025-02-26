import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, throwError, tap, EMPTY } from 'rxjs';
import { Task } from '../interfaces/task.interface';
import { PaginatedResponse } from '../interfaces/paginated-response.interface';
import { AuthService } from './auth.service';
import { SortParams } from '../interfaces/sort-params.interface';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

interface CreateTaskDTO {
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  deadLine: string;
  assignedTo: number;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = `${environment.apiUrl}/tasks`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('No token found - user might need to login again');
      window.location.href = '/login';
      return new HttpHeaders();
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return headers;
  }

  getTasks(page = 0, size = 5, sort?: SortParams, search?: string): Observable<PaginatedResponse<Task>> {
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (sort) {
      params = params.append('sort', `${sort.field},${sort.order}`);
    }

    if (search) {
      params = params.append('search', search);
    }

    return this.http.get<PaginatedResponse<Task>>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(response => {
      }),
      catchError(error => {
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          token: this.authService.getToken()
        });

        if (error.status === 403 || error.status === 401) {
          this.authService.logout();
          window.location.href = '/login';
          return EMPTY;
        }

        const errorMessage = error.status === 0 
          ? 'Unable to connect to the server. Please check your connection and try again.'
          : error.error?.message || 'Error loading tasks';
        
        this.toastService.show(errorMessage, 'error');
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  createTask(taskForm: Partial<Task>): Observable<Task> {
    const userId = this.authService.getUserId();
  
    if (!userId) {
      this.toastService.show('Erro: User not authenticated', 'error');
      return throwError(() => new Error('User not authenticated'));
    }

    const taskData: CreateTaskDTO = {
      title: taskForm.title || '',
      description: taskForm.description || '',
      status: taskForm.status || 'PENDING',
      deadLine: new Date(taskForm.deadLine || '').toISOString(),
      assignedTo: userId
    };


    return this.http.post(this.apiUrl, taskData, {
      headers: this.getHeaders(),
      responseType: 'text'
    }).pipe(
      tap(response => {
        this.toastService.show('Task created successfully!', 'success');
      }),
      map(response => {
        return {
          ...taskData,
          id: Math.random() * 1000,
          createDate: new Date().toISOString()
        } as Task;
      }),
      catchError(error => {
        console.error('TaskService - createTask - Error Response:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          headers: error.headers,
          error: error.error
        });
        const errorMessage = error.error;
        this.toastService.show(errorMessage, 'error');
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  updateTask(task: Task): Observable<Task> {
    
    const taskData = {
      id: Number(task.id),
      title: task.title,
      description: task.description,
      status: task.status,
      deadLine: new Date(task.deadLine).toISOString(),
      assignedTo: Number(task.assignedTo)
    };

    return this.http.put(`${this.apiUrl}/${task.id}`, taskData, {
      headers: this.getHeaders(),
      observe: 'response',
      responseType: 'text'
    }).pipe(
      map(response => {
        if (response.status === 202) {
          this.toastService.show('Task updated successfully!', 'success');
          
          return {
            ...taskData,
            createDate: task.createDate
          } as Task;
        }
        
        throw new Error('Unexpected response status');
      }),
      catchError((error) => {
        console.error('TaskService - updateTask - Error Response:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          headers: error.headers,
          error: error.error
        });
        
        let errorMessage = error.error;
        
        if (error.status === 403) {
          errorMessage = 'You do not have permission to edit this task.';
        }
        
        this.toastService.show(errorMessage, 'error');
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  deleteTask(task: Task): Observable<void> {
    return new Observable(observer => {
      Swal.fire({
        title: 'Confirm deletion',
        text: `Are you sure you want to delete the task "${task.title}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          this.http.delete(`${this.apiUrl}/${task.id}`, {
            headers: this.getHeaders(),
            observe: 'response',
            responseType: 'text'
          }).pipe(
            tap(response => {
              if (response.status === 202) {
                Swal.fire(
                  'Deleted!',
                  'The task has been deleted successfully.',
                  'success'
                );
                observer.next();
                observer.complete();
              }
            }),
            catchError((error) => {
              console.error('Error deleting task:', error);
              let errorMessage = 'Failed to delete task';
              
              if (error.status === 403) {
                errorMessage = 'You do not have permission to delete this task';
              } else if (error.status === 400 && error.error?.message) {
                errorMessage = error.error.message;
              }

              Swal.fire(
                'Error deleting task !',
                errorMessage,
                'error'
              );
              
              return throwError(() => new Error(errorMessage));
            })
          ).subscribe();
        } else {
          observer.complete();
        }
      });
    });
  }

  getTasksByStatus(status: string | null, page: number = 0, size: number = 5): Observable<PaginatedResponse<Task>> {
    let url = `${this.apiUrl}`;
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (status) {
      url += `/filter?status=${status}`;  
    }

    return this.http.get<PaginatedResponse<Task>>(url, {
      headers: this.getHeaders(),
      params
    });
  }

}