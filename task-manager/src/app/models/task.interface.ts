export interface Task {
  id?: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  createdOn: Date;
  deadline: Date;
}

export interface User {
  username: string;
  email: string;
  password: string;
} 