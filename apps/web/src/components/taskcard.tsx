import { useState } from "react";
import type { Task } from "../types";

type TaskCardProps = {
  task: Task;
};

function TaskCard({ task }: TaskCardProps) {
  const [completed, setCompleted] = useState(task.completed);

  return (
    <div>
      <h3>{task.title}</h3>

      <p>
        Status: {completed ? "Completed" : "Pending"}
      </p>

      <button onClick={() => setCompleted(!completed)}>
        {completed ? "Mark as Pending" : "Mark as Complete"}
      </button>
    </div>
  );
}

export default TaskCard;