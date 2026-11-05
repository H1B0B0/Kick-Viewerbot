export const CREATOR_PLATFORMS = ["Kick", "Twitch", "YouTube"] as const;
export type CreatorPlatform = (typeof CREATOR_PLATFORMS)[number];

export type WorkflowStage = "scheduled" | "live" | "review" | "complete";
export type WorkflowTaskId =
  | "announcement"
  | "live"
  | "markers"
  | "clips"
  | "analytics";
export type WorkflowTaskState =
  | "ready"
  | "waiting"
  | "active"
  | "review"
  | "complete";

export interface WorkflowTask {
  id: WorkflowTaskId;
  state: WorkflowTaskState;
}

export interface CreatorWorkflow {
  title: string;
  scheduledFor: string;
  platforms: CreatorPlatform[];
  stage: WorkflowStage;
  tasks: WorkflowTask[];
}

export interface NewWorkflowInput {
  title: string;
  scheduledFor: string;
  platforms: readonly CreatorPlatform[];
}

const INITIAL_TASKS: WorkflowTask[] = [
  { id: "announcement", state: "ready" },
  { id: "live", state: "waiting" },
  { id: "markers", state: "waiting" },
  { id: "clips", state: "waiting" },
  { id: "analytics", state: "waiting" },
];

function updateTask(
  tasks: WorkflowTask[],
  id: WorkflowTaskId,
  state: WorkflowTaskState,
): WorkflowTask[] {
  return tasks.map((task) => (task.id === id ? { ...task, state } : task));
}

export function createWorkflow(input: NewWorkflowInput): CreatorWorkflow {
  const title = input.title.trim();
  const scheduledFor = input.scheduledFor.trim();

  if (!title || !scheduledFor || input.platforms.length === 0) {
    throw new Error(
      "A title, schedule, and at least one platform are required.",
    );
  }

  return {
    title,
    scheduledFor,
    platforms: [...input.platforms],
    stage: "scheduled",
    tasks: INITIAL_TASKS.map((task) => ({ ...task })),
  };
}

export function advanceWorkflow(workflow: CreatorWorkflow): CreatorWorkflow {
  if (workflow.stage === "scheduled") {
    return {
      ...workflow,
      stage: "live",
      tasks: updateTask(
        updateTask(
          updateTask(workflow.tasks, "announcement", "complete"),
          "live",
          "active",
        ),
        "markers",
        "active",
      ),
    };
  }

  if (workflow.stage === "live") {
    return {
      ...workflow,
      stage: "review",
      tasks: updateTask(
        updateTask(
          updateTask(
            updateTask(workflow.tasks, "live", "complete"),
            "markers",
            "review",
          ),
          "clips",
          "review",
        ),
        "analytics",
        "ready",
      ),
    };
  }

  if (workflow.stage === "review") {
    return {
      ...workflow,
      stage: "complete",
      tasks: workflow.tasks.map((task) => ({ ...task, state: "complete" })),
    };
  }

  return workflow;
}

export function workflowProgress(workflow: CreatorWorkflow): number {
  const finished = workflow.tasks.filter(
    (task) => task.state === "complete",
  ).length;

  return Math.round((finished / workflow.tasks.length) * 100);
}
