export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createDate: string;
  deadLine: string;
  assignedTo: number;
} 