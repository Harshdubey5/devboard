export type Task = {
  id: number;
  title: string;
  completed: boolean;
};

export type Project = {
  id: number;
  name: string;
  description: string;
  status: "active" | "completed";
};