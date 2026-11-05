import { describe, expect, it } from "vitest";

import {
  advanceWorkflow,
  createWorkflow,
  workflowProgress,
} from "../../services/creatorWorkflow";

describe("creator workflow", () => {
  const input = {
    title: "Friday challenge run",
    scheduledFor: "2026-10-02T20:00",
    platforms: ["Twitch", "YouTube"] as const,
  };

  it("builds a persistent-ready legal production queue", () => {
    const workflow = createWorkflow(input);

    expect(workflow.stage).toBe("scheduled");
    expect(workflow.tasks.map((task) => task.id)).toEqual([
      "announcement",
      "live",
      "markers",
      "clips",
      "analytics",
    ]);
    expect(workflow.tasks[0].state).toBe("ready");
    expect(workflowProgress(workflow)).toBe(0);
  });

  it("advances from scheduled live through review without claiming platform delivery", () => {
    const live = advanceWorkflow(createWorkflow(input));
    const review = advanceWorkflow(live);

    expect(live.stage).toBe("live");
    expect(live.tasks.find((task) => task.id === "markers")?.state).toBe(
      "active",
    );
    expect(review.stage).toBe("review");
    expect(review.tasks.find((task) => task.id === "clips")?.state).toBe(
      "review",
    );
    expect(review.tasks.find((task) => task.id === "analytics")?.state).toBe(
      "ready",
    );
  });

  it("requires the minimal live plan", () => {
    expect(() =>
      createWorkflow({ title: "", scheduledFor: "", platforms: [] }),
    ).toThrow("A title, schedule, and at least one platform are required.");
  });
});
